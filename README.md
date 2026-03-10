# 💄 Nykaa BI — Conversational AI for Instant Business Intelligence Dashboards

> **Ask a business question in plain English → Get an interactive dashboard in seconds.**  
> Powered by **React + FastAPI + Google Gemini**. No SQL knowledge required.

---

## Architecture

```
nykaa-bi-dashboard/
├── backend/
│   ├── main.py            ← FastAPI REST API (NEW)
│   └── requirements.txt
├── frontend/              ← React + Vite (NEW)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AppContext.jsx
│   │   ├── components/  (Sidebar, ChatArea, ChartCard, QueryInput …)
│   │   └── api/client.js
│   └── package.json
├── tests/
│   ├── test_database.py   ← 25+ unit tests
│   ├── test_api.py        ← 32+ integration tests
│   └── test_llm_engine.py ← 30+ mocked LLM tests
│
│  ── Core logic (unchanged) ─────────────
├── database.py            ← CSV → SQLite engine
├── llm_engine.py          ← Gemini SQL + chart config
└── chart_engine.py        ← Plotly renderer
```

---

## Quick Start

### 1 · Get a Gemini API Key
Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free key.

### 2 · Start the Backend

```bash
cd nykaa-bi-dashboard

# Install backend dependencies
pip install -r backend/requirements.txt

# Run FastAPI server
uvicorn backend.main:app --reload --port 8000
```

API live at `http://localhost:8000` · Swagger docs at `http://localhost:8000/docs`

### 3 · Start the Frontend

```bash
cd nykaa-bi-dashboard/frontend

npm install   # first time only
npm run dev
```

Open **`http://localhost:5173`** — Vite proxies `/api/*` to port 8000 automatically.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System status |
| `POST` | `/api/set-api-key` | Save Gemini API key |
| `POST` | `/api/load-default` | Load bundled Nykaa dataset |
| `POST` | `/api/upload-csv` | Upload your own CSV |
| `GET` | `/api/schema` | Dataset schema |
| `POST` | `/api/query` | Natural-language → chart JSON |
| `POST` | `/api/clear-history` | Reset conversation |

---

## Running Tests

```bash
pip install -r tests/requirements.txt
pytest tests/ -v
```

---

---

## 🎯 What It Does

This web application lets non-technical executives talk to their data using natural language.
Under the hood it uses **Google Gemini** to generate SQL, executes it against a **SQLite** database,
selects the best **Plotly** chart type automatically, and renders a fully interactive dashboard inside **Streamlit**.

### Pipeline
```
Plain English Question
        ↓
  [Gemini LLM]  ← Schema context + conversation history
  Generates SQL
        ↓
  [SQLite DB]   ← CSV loaded in-memory
  Returns rows
        ↓
  [Gemini LLM]  ← Data preview + question
  Selects chart type + axis config
        ↓
  [Plotly]      ← Interactive chart rendered
  User sees dashboard
```

---

## 🚀 Quick Start

### 1. Clone / Download
```bash
git clone https://github.com/YOUR-USERNAME/nykaa-bi-dashboard
cd nykaa-bi-dashboard
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set your Gemini API Key
```bash
# Option A: create a .env file
cp .env.example .env
# then edit .env and paste your key

# Option B: just enter it in the sidebar UI (no file needed)
```
Get a **free** Gemini API key at: https://aistudio.google.com/app/apikey

### 4. Run the app
```bash
streamlit run app.py
```

The app opens at **http://localhost:8501**

---

## 📁 Project Structure
```
nykaa-bi-dashboard/
├── app.py              ← Streamlit UI (chat interface + dashboard)
├── database.py         ← CSV → SQLite loader + SQL executor
├── llm_engine.py       ← Gemini integration (SQL gen + chart selection)
├── chart_engine.py     ← Plotly chart renderer (all chart types)
├── requirements.txt    ← Python dependencies
├── .env.example        ← Environment variable template
└── README.md

../
└── Nykaa Digital Marketing.csv   ← Dataset (must be in parent folder)
```

---

## 💬 Demo Queries (3 Progressive Complexity Levels)

| Level | Query | Chart Type |
|---|---|---|
| Simple | `"Show me total revenue by campaign type"` | Bar chart |
| Medium | `"Monthly revenue trend for each channel throughout 2025"` | Multi-line chart |
| Complex | `"Compare ROI vs Acquisition Cost across all channels for College Students — which is most cost-efficient?"` | Scatter plot |

### Additional Showcase Queries
- `"What are the top 10 campaigns by revenue?"` → Horizontal bar
- `"Show conversion funnel: Impressions → Clicks → Leads → Conversions"` → Funnel chart
- `"Revenue breakdown by language"` → Donut/Pie chart
- `"Engagement score distribution across target audiences"` → Box / Bar chart

### Follow-up Conversation (Bonus Feature)
After generating any chart, ask follow-up questions:
- _"Now filter this to only show Social Media campaigns"_
- _"Break this down by language"_
- _"Only show campaigns from Q1 2025"_

---

## 🗂️ Dataset: Nykaa Digital Marketing

| Column | Description |
|---|---|
| `Campaign_ID` | Unique ID (NY-CMP-XXXX) |
| `Campaign_Type` | Social Media, Paid Ads, Influencer, Email, SEO |
| `Channel_Used` | YouTube, WhatsApp, Google, Instagram, etc. |
| `Target_Audience` | College Students, Youth, Tier 2 City Customers |
| `Customer_Segment` | Customer buckets |
| `Language` | Hindi / English |
| `Duration` | Campaign days |
| `Impressions` / `Clicks` / `Leads` / `Conversions` | Funnel metrics |
| `Revenue` | Revenue in INR |
| `Acquisition_Cost` | Cost per conversion |
| `ROI` | Return on investment |
| `Engagement_Score` | 0–100 score |
| `Date` | DD-MM-YYYY |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend / UI** | Streamlit |
| **Charts** | Plotly Express + Graph Objects |
| **LLM** | Google Gemini 1.5 Flash (via `google-generativeai`) |
| **Database** | SQLite (in-memory via `sqlite3`) |
| **Data Loading** | pandas |

---

## 📊 Evaluation Criteria Coverage

| Criterion | Implementation |
|---|---|
| **Data Retrieval Accuracy** | Gemini generates SQLite SQL with schema + sample values in the prompt; 1 auto-retry with error feedback |
| **Contextual Chart Selection** | Gemini given chart selection rules for line/bar/pie/scatter/funnel/heatmap; auto-fallback if parsing fails |
| **Hallucination Handling** | LLM instructed to return `SELECT 'CANNOT_ANSWER'` if question is out-of-scope; graceful UI message shown |
| **Aesthetics & UX** | Dark Nykaa-branded theme, responsive layout, loading spinner, metric summary cards |
| **Interactivity** | Plotly hover tooltips, zoom/pan, downloadable charts |
| **Follow-up Queries** | Conversation history passed to LLM; SQL rewrite prompt for follow-ups (Bonus ✅) |
| **CSV Upload** | Any CSV can be uploaded and immediately queried (Bonus ✅) |

---

## 🔧 Configuration

### Switching LLM Model
In `llm_engine.py`:
```python
GEMINI_MODEL = "gemini-2.5-flash"   # free tier, fast
# GEMINI_MODEL = "gemini-2.5-pro"   # better quality, use for production
```

### Adjusting Result Limit
In `llm_engine.py` → `SQL_SYSTEM_PROMPT`, change:
```
Limit results to 50 rows max...
```

---

## ⚙️ Error Handling

| Error Type | Handling |
|---|---|
| Invalid SQL | Auto-retry: Gemini corrects the SQL with error feedback |
| Empty results | User-friendly message shown |
| Out-of-scope question | "Cannot answer" message with explanation |
| API key missing | Warning banner in the app |
| CSV parse error | Error message with detail |

---

## 📜 License
MIT License — free for personal and commercial use.
