# Nykaa BI — Conversational AI Dashboard

> **Ask a business question in plain English → Get an interactive chart in seconds.**  
> Powered by **React + Flask + Google Gemini**. No SQL knowledge required.

---

## What It Does

Nykaa BI is a full-stack web application that lets non-technical users talk to their marketing data using plain English. You type a question, Gemini converts it to SQL, the SQL runs against a SQLite database, and the result renders as an interactive chart — all in one round-trip.

Key capabilities:
- Multi-user authentication (register / login / logout)
- Load the bundled Nykaa Digital Marketing dataset or upload your own CSV
- Natural-language → SQL → interactive chart pipeline
- Auto-correction: if Gemini's SQL fails, it retries with the error as feedback
- Follow-up query detection — ask refinements without repeating context
- Overview/dashboard queries generate multiple charts at once
- AI-generated 2-sentence business insight per chart
- Smart follow-up chip suggestions after every answer
- Persistent per-user chat sessions with full history
- Schema viewer and AI-powered query suggestions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Python, Flask, Flask-CORS |
| LLM | Google Gemini 2.5 Flash (`google-generativeai`) |
| Database | SQLite (pandas ingestion + sqlite3 queries) |
| Auth | Token-based (werkzeug password hashing, secrets token) |
| Deployment | Render (backend) · Vercel (frontend) |

---

## Project Structure

```
nykaa-bi-dashboard/
├── backend/
│   ├── main.py          ← Flask REST API — all endpoints
│   ├── auth.py          ← User auth, sessions, query history (auth.db)
│   ├── database.py      ← CSV → SQLite engine + schema introspection
│   ├── llm_engine.py    ← Gemini SQL generation, chart config, insights
│   ├── requirements.txt
│   ├── Procfile
│   ├── railway.json
│   └── data/
│       └── Nykaa Digital Marketing.csv   ← bundled dataset
├── frontend/
│   ├── src/
│   │   ├── App.jsx               ← auth gate, root layout
│   │   ├── context/AppContext.jsx ← global state + API calls
│   │   ├── api/client.js         ← axios wrapper for all endpoints
│   │   └── components/
│   │       ├── LoginPage.jsx     ← register / login form
│   │       ├── Sidebar.jsx       ← dataset loader, model picker, sessions
│   │       ├── MainPanel.jsx     ← header, metric bar, chat, input
│   │       ├── ChatArea.jsx      ← scrollable message list
│   │       ├── ChatMessage.jsx   ← renders one message (chart or error)
│   │       ├── ChartCard.jsx     ← Recharts renderer (8 chart types)
│   │       ├── QueryInput.jsx    ← text input + submit
│   │       ├── MetricBar.jsx     ← dataset KPI strip
│   │       ├── EmptyState.jsx    ← prompt when no dataset loaded
│   │       └── LoadingBubble.jsx ← animated typing indicator
│   ├── vite.config.js    ← dev proxy: /api → localhost:8000
│   └── package.json
└── render.yaml           ← Render deployment config
```

---

## Request / Response Flow

```
User types a question
        │
        ▼
React QueryInput
        │  POST /api/query  { question, session_id }
        ▼
Flask main.py  ──► auth check (Bearer token)
        │
        ├─ Step 1: Overview detection
        │          keywords: "overview", "dashboard", "summary" …
        │          → _handle_multi_chart() generates multiple charts
        │
        ├─ Step 2: Follow-up detection
        │          LLM classifier: "is this a follow-up of the last question?"
        │
        ├─ Step 3: SQL generation  (llm_engine.py)
        │          Gemini prompt includes schema + conversation history
        │          Returns raw SQLite SQL
        │
        ├─ Step 4: SQL execution  (database.py)
        │          sqlite3 runs query against the loaded dataset
        │          On error → Gemini auto-corrects and retries once
        │
        ├─ Step 5: Chart config  (llm_engine.py)
        │          Gemini selects chart type + x/y/color axes
        │          Types: bar, line, area, pie, scatter,
        │                 horizontal_bar, funnel, heatmap
        │
        ├─ Step 6: Build chart descriptor
        │          Formats result_df into JSON for Recharts
        │
        ├─ Step 7: Insight + follow-up chips  (llm_engine.py)
        │          Gemini writes 2-sentence business insight
        │          Gemini suggests 3 follow-up questions
        │
        ├─ Step 8: Update conversation history (in-memory)
        │
        └─ Step 9: Persist to auth.db
                   → query_history + session_messages tables
                        │
                        ▼
              JSON response to React
                        │
                        ▼
         ChartCard  renders Recharts chart
         + insight text + follow-up chip buttons
```

---

## Authentication Flow

```
Register / Login
      │  POST /api/auth/register  or  /api/auth/login
      ▼
auth.py  hashes password (werkzeug)
         creates a random token (secrets.token_hex)
         stores in sessions table (auth.db)
      │
      ▼
Token stored in localStorage  →  sent as  Authorization: Bearer <token>
on every subsequent request   →  _require_auth() validates it
```

---

## Database Layer

`database.py` — `DatabaseEngine` class:

1. Reads CSV with pandas (tries UTF-8 → UTF-8-BOM → Latin-1 → CP1252)
2. Cleans column names (spaces/hyphens → underscores)
3. Attempts numeric type inference per column
4. Persists DataFrame to a SQLite file (`nykaa_data.db`) via `df.to_sql()`
5. Builds a schema string (column names + types + sample values) used in every LLM prompt
6. On startup, tries to re-load from the existing SQLite file before falling back to the CSV

`auth.py` — separate `auth.db` with five tables:

| Table | Purpose |
|---|---|
| `users` | username + hashed password |
| `sessions` | token → user_id mapping |
| `query_history` | per-user query log |
| `chat_sessions` | named conversation threads |
| `session_messages` | full message history per session |

---

## LLM Engine

`llm_engine.py` — `LLMEngine` class wraps `google-generativeai`:

| Method | Gemini prompt used |
|---|---|
| `generate_sql()` | SQL_SYSTEM_PROMPT — schema + history + question |
| `fix_sql()` | ERROR_CORRECTION_PROMPT — broken SQL + error message |
| `get_chart_config()` | CHART_SYSTEM_PROMPT — columns + sample rows |
| `generate_insight()` | INSIGHT_GENERATION_PROMPT — chart type + data |
| `generate_followup_chips()` | FOLLOWUP_CHIPS_PROMPT — columns + chart |
| `generate_suggestions()` | dynamic — schema + sample rows |
| `generate_multi_chart()` | multi-chart dashboard spec |
| `is_followup_query()` | FOLLOWUP_CLASSIFIER_PROMPT — yes / no |

Conversation history is kept in-memory as a rolling list of `(question, sql, result_summary)` tuples and injected into every SQL prompt.

---

## API Reference

All endpoints are prefixed `/api`. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server + DB + LLM status |
| `POST` | `/api/auth/register` | No | Create account, returns token |
| `POST` | `/api/auth/login` | No | Login, returns token |
| `POST` | `/api/auth/logout` | No | Invalidate token |
| `GET` | `/api/auth/me` | Yes | Current user info |
| `GET` | `/api/models` | No | Available Gemini models |
| `POST` | `/api/set-model` | Yes | Switch active Gemini model |
| `POST` | `/api/load-default` | Yes | Load bundled Nykaa CSV |
| `POST` | `/api/upload-csv` | Yes | Upload custom CSV |
| `GET` | `/api/schema` | Yes | Dataset schema string |
| `POST` | `/api/query` | Yes | NL question → chart JSON |
| `GET` | `/api/suggestions` | Yes | AI-generated query suggestions |
| `GET` | `/api/history` | Yes | User's query history |
| `GET` | `/api/sessions` | Yes | User's chat sessions |
| `DELETE` | `/api/sessions/<id>` | Yes | Delete a chat session |
| `GET` | `/api/sessions/<id>/messages` | Yes | Messages in a session |

---

## Quick Start (Local)

### 1. Get a Gemini API Key
Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free key.

### 2. Configure the backend

Create `nykaa-bi-dashboard/.env`:

```
GEMINI_API_KEY=your_key_here
```

### 3. Start the backend

```bash
cd nykaa-bi-dashboard/backend

pip install -r requirements.txt

python main.py
# or: flask --app main run --port 8000
```

API available at `http://localhost:8000`

### 4. Start the frontend

```bash
cd nykaa-bi-dashboard/frontend

npm install      # first time only
npm run dev
```

Open **`http://localhost:5173`** — Vite automatically proxies `/api/*` requests to port 8000.

---

## Deployment

### Backend → Render

The `render.yaml` at the project root configures a Python web service:

```yaml
startCommand: gunicorn main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

Set `GEMINI_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL) as environment variables in the Render dashboard.

### Frontend → Vercel

```bash
cd frontend
# set VITE_API_URL to your Render backend URL in Vercel project settings
vercel deploy --prod
```

`VITE_API_URL` is the backend root URL (e.g. `https://nykaa-bi-backend.onrender.com`). Leave it unset for local dev — the Vite proxy handles routing automatically.

---

## Chart Types

| Type | When Gemini picks it |
|---|---|
| `bar` | Category comparison |
| `horizontal_bar` | More than 5 categories |
| `line` | Time-series trends |
| `area` | Cumulative or stacked trends |
| `pie` | Parts-of-whole (≤ 8 slices) |
| `scatter` | Two-metric correlation |
| `funnel` | Conversion stages |
| `heatmap` | Two categorical dimensions + numeric value |

Every chart supports: custom Nykaa-pink color palette, interactive tooltips, PNG export, raw data table view, and SQL inspector.

---

## Dataset

The bundled dataset (`backend/data/Nykaa Digital Marketing.csv`) contains Nykaa digital marketing campaign records with columns including Date, Channel_Used, Campaign_Type, Target_Audience, Budget, Revenue, Clicks, Impressions, Conversion_Rate, ROI, and more.

The `Channel_Used` column is multi-value (comma-separated); the LLM is instructed to query it with `LIKE '%value%'`. Dates are stored as `DD-MM-YYYY` text; the LLM uses `substr()` for year/month extraction and sorting.

---

## Pipeline Summary

```
Plain English Question
        │
        ▼
  [Auth Guard]  ──────────────── 401 if no valid token
        │
        ▼
  [Dataset Check]  ───────────── 400 if no CSV loaded
        │
        ▼
  Gemini → SQL  ──────────────── schema + history context
        │
        ▼
  SQLite Execution
        │── success ──► Chart Config → Insight → Chips → Response
        │
        └── error ───► Gemini auto-fix → retry → error response
```
