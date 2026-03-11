"""
llm_engine.py — Gemini-powered intelligence layer.

Responsibilities:
  1. Generate SQLite SQL from a natural-language question (with schema context)
  2. Select the best chart type + axis config from query results
  3. Maintain conversation context for follow-up queries
  4. Retry with error feedback if generated SQL fails
"""

import json
import re
import os
import time
from typing import Optional
import google.generativeai as genai


# ─── Model config ─────────────────────────────────────────────────────────────
AVAILABLE_MODELS: dict[str, str] = {
    "gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash Lite Preview",
    # Add more models here in the future, e.g.:
    # "gemini-2.0-pro": "Gemini 2.0 Pro",
}
DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


# ─── Prompt Templates ─────────────────────────────────────────────────────────

SQL_SYSTEM_PROMPT = """SQLite analyst for a BI dashboard. Convert the question to valid SQLite SQL.

RULES:
1. Return ONLY raw SQL — no markdown, no explanation.
2. Date column is DD-MM-YYYY text: year=substr(Date,7,4), month=substr(Date,4,2), sort=substr(Date,7,4)||substr(Date,4,2)||substr(Date,1,2)
3. Channel_Used multi-value: use LIKE '%value%'
4. Column names are case-sensitive. ROUND(...,2) for floats. ORDER BY for trends/rankings. LIMIT 50.
5. If unanswerable: SELECT 'CANNOT_ANSWER' AS error_message

{schema}

History:
{history}

Question: {question}
"""

CHART_SYSTEM_PROMPT = """Pick the best chart type for BI data. Return ONLY valid JSON, no markdown.

TYPES: line=time-series, bar=category compare, horizontal_bar=>5 categories, pie=parts-of-whole(<=8), scatter=2-metric correlation, area=cumulative, funnel=conversion stages, heatmap=2-cat+numeric

JSON format: {{"chart_type":"bar","x_column":"col","y_column":"col","color_column":null,"title":"Title","x_label":"X","y_label":"Y","sort_descending":true,"text_column":null}}

Question: {question}
Columns: {columns}
Sample rows: {sample_rows}
"""

FOLLOW_UP_REWRITE_PROMPT = """Rewrite the SQL for the follow-up. Return ONLY the new SQL.

Previous question: {original_question}
Previous SQL: {original_sql}
Follow-up: {follow_up}
Schema: {schema}
"""

FOLLOWUP_CLASSIFIER_PROMPT = """Is the new question a follow-up/refinement of the previous? Answer only "yes" or "no".

Previous: {previous_question}
New: {new_question}
"""

ERROR_CORRECTION_PROMPT = """Fix this SQLite query. Return ONLY corrected SQL.
Query: {sql}
Error: {error}
Schema: {schema}
Question: {question}
"""

INSIGHT_GENERATION_PROMPT = """You are a senior BI analyst. Given a chart produced from data, write exactly 2 sentences of business insight.

Rules:
- Sentence 1: State the most important finding with a specific number/metric from the data.
- Sentence 2: Identify a trend, risk, or action item for business stakeholders.
- Use rupee symbol ₹ for monetary values. Be specific, not generic.
- Return ONLY the 2 sentences, no labels, no markdown.

Question asked: {question}
Chart type: {chart_type}
Data summary (top rows): {sample_rows}
"""

FOLLOWUP_CHIPS_PROMPT = """You are a BI assistant. Based on the query and chart just shown, suggest exactly 3 short follow-up questions a business user would want to ask next.

Rules:
- Each question must be under 8 words
- Must be answerable from the same dataset
- Should vary: one drill-down, one comparison, one filter/top-N
- Return ONLY a raw JSON array of 3 strings, no markdown

Dataset columns: {columns}
Question just asked: {question}
Chart type produced: {chart_type}
"""

MULTI_CHART_PROMPT = """You are a BI analyst building a dashboard. Generate exactly 3 different SQLite queries that each analyze a DIFFERENT dimension of the data.

Return ONLY a raw JSON array of exactly 3 objects, no markdown:
[
  {{"sql": "SELECT col1, SUM(col2) FROM table GROUP BY col1 ORDER BY 2 DESC LIMIT 15", "title": "Revenue by Channel", "chart_type": "bar"}},
  ...
]

chart_type options: bar, horizontal_bar, line, area, pie

Rules:
1. Each SQL must be valid SQLite — no semicolons, no markdown fences
2. Date column format DD-MM-YYYY text: year=substr(Date,7,4), month=substr(Date,4,2)
3. First query: category/dimension breakdown (bar or pie)
4. Second query: time trend if Date exists, else another dimension (line or area or bar)
5. Third query: top-N ranking by a metric (horizontal_bar, LIMIT 10)
6. Column names are CASE-SENSITIVE — use exact names from schema
7. Use table name exactly as shown in schema

Schema:
{schema}

Overview question: {question}
"""

SUGGESTIONS_PROMPT = """You are a BI analyst. Based on this dataset, generate exactly 6 insightful
business intelligence questions that would produce interesting charts.

Schema:
{schema}

Sample data (first 10 rows):
{sample_rows}

Rules:
- Questions must be answerable from the actual columns present
- Vary types: trends, comparisons, totals, rankings, distributions
- Keep each question concise (under 12 words)
- Return ONLY a raw JSON array of 6 question strings, no markdown, no explanation

Example output: ["Total sales by category?", "Monthly revenue trend for 2024"]
"""


# ─── Engine ───────────────────────────────────────────────────────────────────

class LLMEngine:
    """Wraps Gemini API for SQL generation, chart config selection, and retry logic."""

    def __init__(self, api_key: str, model_name: str = DEFAULT_GEMINI_MODEL):
        genai.configure(api_key=api_key)
        if model_name not in AVAILABLE_MODELS:
            model_name = DEFAULT_GEMINI_MODEL
        self.model = genai.GenerativeModel(model_name)
        self.current_model_name: str = model_name
        self.conversation_history: list[dict] = []  # {role, question, sql, result_summary}
        self.last_request_time: float = 0  # Track last API call for throttling
        self.min_request_interval: float = 3.0  # Minimum 3 seconds between requests

    # ─── Public API ──────────────────────────────────────────────────────────

    def generate_sql(
        self,
        question: str,
        schema: str,
        is_followup: bool = False,
        original_sql: Optional[str] = None,
    ) -> str:
        """Generate SQLite SQL from a natural-language question."""
        if is_followup and original_sql and self.conversation_history:
            return self._rewrite_for_followup(question, original_sql, schema)

        history_text = self._format_history()
        prompt = SQL_SYSTEM_PROMPT.format(
            schema=schema,
            history=history_text or "None",
            question=question,
        )
        response = self._call_gemini(prompt)
        sql = self._clean_sql(response)
        return sql

    def fix_sql(self, sql: str, error: str, schema: str, question: str) -> str:
        """Ask Gemini to fix a broken SQL query."""
        prompt = ERROR_CORRECTION_PROMPT.format(
            sql=sql, error=error, schema=schema, question=question
        )
        response = self._call_gemini(prompt)
        return self._clean_sql(response)

    def get_chart_config(
        self, question: str, columns: list[str], sample_rows: list[dict]
    ) -> dict:
        """Return the best chart configuration for the query result."""
        sample_str = json.dumps(sample_rows[:5], indent=2, default=str)
        prompt = CHART_SYSTEM_PROMPT.format(
            question=question,
            columns=columns,
            sample_rows=sample_str,
        )
        response = self._call_gemini(prompt)
        return self._parse_json(response)

    def add_to_history(self, question: str, sql: str, result_summary: str):
        """Store a resolved Q&A turn for conversation context."""
        self.conversation_history.append(
            {
                "question": question,
                "sql": sql,
                "result_summary": result_summary,
            }
        )
        # Keep only the last 3 turns to avoid token bloat
        if len(self.conversation_history) > 3:
            self.conversation_history = self.conversation_history[-3:]

    def generate_insight(self, question: str, chart_type: str, sample_rows: list[dict]) -> str:
        """Generate a 2-sentence business insight for a chart."""
        sample_str = json.dumps(sample_rows[:8], indent=2, default=str)
        prompt = INSIGHT_GENERATION_PROMPT.format(
            question=question,
            chart_type=chart_type,
            sample_rows=sample_str,
        )
        try:
            response = self._call_gemini(prompt)
            return response.strip()
        except Exception:
            return ""

    def generate_followup_chips(self, question: str, chart_type: str, columns: list[str]) -> list[str]:
        """Generate 3 follow-up query suggestions based on current chart context."""
        prompt = FOLLOWUP_CHIPS_PROMPT.format(
            question=question,
            chart_type=chart_type,
            columns=", ".join(columns),
        )
        try:
            response = self._call_gemini(prompt)
            text = re.sub(r"```(?:json)?\s*", "", response, flags=re.IGNORECASE)
            text = re.sub(r"```", "", text).strip()
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if match:
                chips = json.loads(match.group())
                if isinstance(chips, list):
                    return [str(c) for c in chips[:3] if c]
        except Exception:
            pass
        return []

    def generate_multi_chart(self, question: str, schema: str, sample_rows: list[dict]) -> list[dict]:
        """Generate 3 {sql, title, chart_type} dicts for an overview/dashboard query."""
        prompt = MULTI_CHART_PROMPT.format(question=question, schema=schema)
        try:
            response = self._call_gemini(prompt)
            text = re.sub(r"```(?:json)?\s*", "", response, flags=re.IGNORECASE)
            text = re.sub(r"```", "", text).strip()
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if match:
                items = json.loads(match.group())
                if isinstance(items, list):
                    valid = [
                        d for d in items
                        if isinstance(d, dict) and d.get("sql") and d.get("title")
                    ]
                    return valid[:4]
        except Exception:
            pass
        return []

    def generate_suggestions(self, schema: str, sample_rows: list[dict]) -> list[str]:
        """Generate dynamic query suggestions from dataset schema and first 10 rows."""
        sample_str = json.dumps(sample_rows[:10], indent=2, default=str)
        prompt = SUGGESTIONS_PROMPT.format(schema=schema, sample_rows=sample_str)
        try:
            response = self._call_gemini(prompt)
            text = re.sub(r"```(?:json)?\s*", "", response, flags=re.IGNORECASE)
            text = re.sub(r"```", "", text).strip()
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if match:
                suggestions = json.loads(match.group())
                if isinstance(suggestions, list):
                    return [str(s) for s in suggestions[:8] if s]
        except Exception:
            pass
        # Fallback generic suggestions
        return [
            "Show top 10 records by value",
            "Distribution of categories",
            "Trend over time",
            "Compare groups",
            "Show summary statistics",
            "Find top and bottom performers",
        ]

    def clear_history(self):
        self.conversation_history = []

    def classify_followup(self, question: str) -> bool:
        """Use the LLM to decide if `question` is a follow-up to the previous turn."""
        if not self.conversation_history:
            return False
        previous_question = self.conversation_history[-1].get("question", "")
        prompt = FOLLOWUP_CLASSIFIER_PROMPT.format(
            previous_question=previous_question,
            new_question=question,
        )
        try:
            answer = self._call_gemini(prompt).strip().lower()
            return answer.startswith("yes")
        except Exception:
            return False

    # ─── Private Helpers ─────────────────────────────────────────────────────

    def _call_gemini(self, prompt: str) -> str:
        """Raw call to Gemini with minimal retry on 429."""
        # Throttle requests to avoid rate limiting
        time_since_last = time.time() - self.last_request_time
        if time_since_last < self.min_request_interval:
            wait = self.min_request_interval - time_since_last
            time.sleep(wait)

        # Single retry with longer wait
        for attempt in range(2):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                    ),
                )
                self.last_request_time = time.time()
                return response.text.strip()
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RATE_LIMIT_EXCEEDED" in err_str or "quota" in err_str.lower():
                    if attempt == 0:
                        time.sleep(10)
                        continue
                    else:
                        raise RuntimeError(
                            f"⚠️ Gemini API rate limit reached.\n\n"
                            f"Error details: {err_str[:200]}\n\n"
                            f"💡 Solutions:\n"
                            f"• Wait 2-3 minutes before trying again\n"
                            f"• Verify your API key is active at https://aistudio.google.com/app/apikey\n"
                            f"• Check if your API key has quota remaining\n"
                            f"• Try creating a new API key if this one is exhausted"
                        )
                else:
                    raise RuntimeError(f"Gemini API error: {err_str}")

    def _clean_sql(self, text: str) -> str:
        """Strip markdown fences and whitespace from LLM SQL output."""
        # Remove ```sql ... ``` or ``` ... ```
        text = re.sub(r"```(?:sql)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```", "", text)
        text = text.strip().rstrip(";").strip()
        # Remove any leading explanation lines (lines not starting with SQL keywords)
        lines = text.split("\n")
        sql_start = 0
        sql_keywords = {
            "SELECT", "WITH", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "PRAGMA"
        }
        for i, line in enumerate(lines):
            if line.strip().upper().split()[0:1] and line.strip().upper().split()[0] in sql_keywords:
                sql_start = i
                break
        return "\n".join(lines[sql_start:]).strip()

    def _parse_json(self, text: str) -> dict:
        """Extract and parse JSON from LLM response."""
        # Remove markdown fences
        text = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```", "", text).strip()

        # Find first { ... } block
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Fallback: default bar chart config
        return {
            "chart_type": "bar",
            "x_column": None,
            "y_column": None,
            "color_column": None,
            "title": "Query Result",
            "x_label": "",
            "y_label": "",
            "sort_descending": True,
            "text_column": None,
        }

    def _format_history(self) -> str:
        """Format conversation history for the SQL prompt."""
        if not self.conversation_history:
            return ""
        lines = []
        for i, turn in enumerate(self.conversation_history[-2:], 1):  # last 2 turns
            sql_preview = turn['sql'][:120].replace('\n', ' ') + ('...' if len(turn['sql']) > 120 else '')
            lines.append(f"Q{i}: {turn['question']} | SQL: {sql_preview}")
        return "\n".join(lines)

    def _rewrite_for_followup(
        self, follow_up: str, original_sql: str, schema: str
    ) -> str:
        """Rewrite an existing SQL query to incorporate a follow-up request."""
        last_turn = self.conversation_history[-1] if self.conversation_history else {}
        original_question = last_turn.get("question", "previous question")

        prompt = FOLLOW_UP_REWRITE_PROMPT.format(
            original_sql=original_sql,
            original_question=original_question,
            follow_up=follow_up,
            schema=schema,
        )
        response = self._call_gemini(prompt)
        return self._clean_sql(response)


# ─── Follow-up Detection (LLM-based) ────────────────────────────────────────

def is_followup_query(question: str, engine: "LLMEngine | None" = None) -> bool:
    """
    Classify whether `question` is a follow-up using the LLM engine.
    If no engine is available (e.g. during init), defaults to False.
    """
    if engine is None or not engine.conversation_history:
        return False
    return engine.classify_followup(question)
