"""
main.py — Flask Backend for InsightQ Dashboard

Exposes REST endpoints consumed by the React frontend.
Run:  python backend/main.py
  or: flask --app backend/main run --port 8000
"""

import os
import sys
import math
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import auth as auth_module
from database import DatabaseEngine
from llm_engine import LLMEngine, is_followup_query, AVAILABLE_MODELS, DEFAULT_GEMINI_MODEL

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

app = Flask(__name__)

# Allow all origins — safe for a public demo/hackathon project.
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─── App state ────────────────────────────────────────────────────────────────
_state = {
    "db": None,
    "llm": None,
    "last_sql": None,
    "api_key": os.getenv("GEMINI_API_KEY", ""),
    "message_count": 0,
    "selected_model": DEFAULT_GEMINI_MODEL,
}


# ─── Startup init ─────────────────────────────────────────────────────────────
def _init_db():
    """Try to load the dataset from the already-persisted SQLite file."""
    db = DatabaseEngine()
    if db.load_from_existing_db():
        pass
    else:
        try:
            db.load_default()
        except Exception:
            return
    _state["db"] = db


auth_module.init_db()   # Ensure auth tables exist
_init_db()



@app.get("/api/health")
def health():
    db = _state["db"]
    return jsonify({
        "status": "ok",
        "db_ready": db is not None and db.is_ready(),
        "api_key_set": bool(_state["api_key"]),
        "llm_ready": _state["llm"] is not None,
    })


# ─── Auth helpers ─────────────────────────────────────────────────────────────

def _get_current_user():
    """Extract authenticated user from Authorization: Bearer <token> header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        return auth_module.get_user(token)
    return None


def _require_auth():
    """Return (user_dict, None) or (None, error_response)."""
    user = _get_current_user()
    if not user:
        return None, (jsonify({"detail": "Authentication required."}), 401)
    return user, None


# ─── Auth endpoints ───────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register():
    body = request.get_json(force=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not username or not password:
        return jsonify({"detail": "Username and password are required."}), 400
    try:
        result = auth_module.register(username, password)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"detail": str(e)}), 409


@app.post("/api/auth/login")
def user_login():
    body = request.get_json(force=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not username or not password:
        return jsonify({"detail": "Username and password are required."}), 400
    try:
        result = auth_module.login(username, password)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"detail": str(e)}), 401


@app.post("/api/auth/logout")
def user_logout():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        auth_module.logout(auth_header[7:])
    return jsonify({"message": "Logged out."})


@app.get("/api/auth/me")
def auth_me():
    user = _get_current_user()
    if not user:
        return jsonify({"detail": "Not authenticated."}), 401
    return jsonify(user)


# ─── Models ───────────────────────────────────────────────────────────────────

@app.get("/api/models")
def get_models():
    return jsonify({
        "models": [{"id": k, "label": v} for k, v in AVAILABLE_MODELS.items()],
        "selected": _state["selected_model"],
    })


@app.post("/api/set-model")
def set_model():
    user, err = _require_auth()
    if err:
        return err
    body = request.get_json(force=True) or {}
    model_id = (body.get("model") or "").strip()
    if model_id not in AVAILABLE_MODELS:
        return jsonify({"detail": f"Unknown model '{model_id}'."}), 400
    _state["selected_model"] = model_id
    _state["llm"] = None  # Re-init on next request
    return jsonify({"message": f"Model set to {AVAILABLE_MODELS[model_id]}.", "model": model_id})


# ─── Data Loading ─────────────────────────────────────────────────────────────

# ─── Dynamic Suggestions ──────────────────────────────────────────────────────

@app.get("/api/suggestions")
def get_suggestions():
    user, err = _require_auth()
    if err:
        return err
    db = _state["db"]
    if db is None or not db.is_ready():
        return jsonify({"detail": "No dataset loaded."}), 400
    if not _state["api_key"]:
        return jsonify({"detail": "Gemini API key not configured on server."}), 500
    if _state["llm"] is None:
        try:
            _state["llm"] = LLMEngine(_state["api_key"], _state["selected_model"])
        except Exception as e:
            return jsonify({"detail": f"Failed to initialise Gemini: {e}"}), 500
    sample_rows = db.df.head(10).to_dict(orient="records")
    try:
        suggestions = _state["llm"].generate_suggestions(db.schema_info, sample_rows)
        return jsonify({"suggestions": suggestions})
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


# ─── User Query History ───────────────────────────────────────────────────────

@app.get("/api/history")
def get_user_history():
    user, err = _require_auth()
    if err:
        return err
    history = auth_module.get_history(user["user_id"])
    return jsonify({"history": history})


# ─── Chat Sessions ────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def get_sessions():
    user, err = _require_auth()
    if err:
        return err
    sessions = auth_module.get_chat_sessions(user["user_id"])
    return jsonify({"sessions": sessions})


@app.delete("/api/sessions/<int:session_id>")
def delete_session(session_id):
    user, err = _require_auth()
    if err:
        return err
    deleted = auth_module.delete_chat_session(session_id, user["user_id"])
    if not deleted:
        return jsonify({"detail": "Session not found."}), 404
    return jsonify({"message": "Session deleted."})


@app.get("/api/sessions/<int:session_id>/messages")
def get_session_messages(session_id):
    user, err = _require_auth()
    if err:
        return err
    messages = auth_module.get_chat_session_messages(session_id, user["user_id"])
    if messages is None:
        return jsonify({"detail": "Session not found."}), 404
    return jsonify({"messages": messages})


# ─── Data Loading ─────────────────────────────────────────────────────────────

@app.post("/api/load-default")
def load_default():
    user, err = _require_auth()
    if err:
        return err
    try:
        db = DatabaseEngine()
        db.load_default()
        _state["db"] = db
        _state["last_sql"] = None
        _state["message_count"] = 0
        _state["llm"] = None
        session_id = auth_module.create_chat_session(user["user_id"], db.table_name)
        df = db.df
        return jsonify({
            "message": "Dataset loaded successfully.",
            "table_name": db.table_name,
            "rows": len(df),
            "columns": db.get_column_names(),
            "metrics": _build_metrics(df),
            "session_id": session_id,
        })
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


@app.post("/api/upload-csv")
def upload_csv():
    user, err = _require_auth()
    if err:
        return err
    if "file" not in request.files:
        return jsonify({"detail": "No file provided."}), 400
    file = request.files["file"]
    if not (file.filename or "").lower().endswith(".csv"):
        return jsonify({"detail": "Only CSV files are supported."}), 400
    try:
        content = file.read()
        db = DatabaseEngine()
        db.load_from_upload(content, file.filename)
        _state["db"] = db
        _state["last_sql"] = None
        _state["message_count"] = 0
        _state["llm"] = None
        session_id = auth_module.create_chat_session(user["user_id"], db.table_name)
        df = db.df
        return jsonify({
            "message": f"Loaded '{file.filename}' successfully.",
            "table_name": db.table_name,
            "rows": len(df),
            "columns": db.get_column_names(),
            "metrics": _build_metrics(df),
            "session_id": session_id,
        })
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


@app.get("/api/schema")
def get_schema():
    user, err = _require_auth()
    if err:
        return err
    db = _state["db"]
    if db is None or not db.is_ready():
        return jsonify({"detail": "No dataset loaded."}), 400
    return jsonify({"schema": db.schema_info, "table_name": db.table_name})


# ─── Query Pipeline ───────────────────────────────────────────────────────────

@app.post("/api/query")
def run_query():
    user, err = _require_auth()
    if err:
        return err

    body = request.get_json(force=True) or {}
    question = (body.get("question") or "").strip()
    session_id = body.get("session_id")
    if not question:
        return jsonify({"detail": "Question cannot be empty."}), 400

    db = _state["db"]
    if db is None or not db.is_ready():
        return jsonify({"detail": "No dataset loaded. Please load a dataset first."}), 400

    if not _state["api_key"]:
        return jsonify({"detail": "Gemini API key not configured on server (.env)."}), 500

    # Lazy-init LLM
    if _state["llm"] is None:
        try:
            _state["llm"] = LLMEngine(_state["api_key"], _state["selected_model"])
        except Exception as e:
            return jsonify({"detail": f"Failed to initialise Gemini: {e}"}), 500

    llm = _state["llm"]

    # ── Step 1: Multi-chart dashboard detection ───────────────────────────
    OVERVIEW_KEYWORDS = {"overview", "dashboard", "summary", "performance", "full report",
                         "all metrics", "complete", "breakdown", "overall"}
    is_overview = any(kw in question.lower() for kw in OVERVIEW_KEYWORDS)

    if is_overview:
        return _handle_multi_chart(question, db, llm, user, session_id)

    # ── Step 2: Follow-up detection ───────────────────────────────────────
    followup = (
        _state["message_count"] > 0
        and _state["last_sql"] is not None
        and is_followup_query(question, engine=llm)
    )

    # ── Step 3: Generate SQL ──────────────────────────────────────────────
    try:
        sql = llm.generate_sql(
            question=question,
            schema=db.schema_info,
            is_followup=followup,
            original_sql=_state["last_sql"],
        )
    except Exception as e:
        return jsonify(_error_payload(str(e), sql=None))

    # ── Step 4: Execute SQL (with 1 auto-correction retry) ────────────────
    result_df, error = db.execute_query(sql)

    if error == "cannot_answer":
        return jsonify({
            "type": "cannot_answer",
            "message": (
                "The available data doesn't contain enough information to answer "
                "this question. Try rephrasing or asking about topics in the dataset."
            ),
            "sql": sql,
            "is_followup": followup,
            "available_columns": db.get_column_names(),
        })

    if error and result_df is None:
        try:
            fixed_sql = llm.fix_sql(sql, error, db.schema_info, question)
            result_df, error2 = db.execute_query(fixed_sql)
            if error2 or result_df is None:
                return jsonify(_error_payload(
                    f"Could not execute the query after auto-correction. Detail: {error2 or error}",
                    sql=fixed_sql,
                ))
            sql = fixed_sql
        except Exception as retry_err:
            return jsonify(_error_payload(str(retry_err), sql=sql))

    # ── Step 5: Chart config ──────────────────────────────────────────────
    sample_rows = result_df.head(5).to_dict(orient="records")
    try:
        chart_config = llm.get_chart_config(
            question=question,
            columns=result_df.columns.tolist(),
            sample_rows=sample_rows,
        )
    except Exception:
        cols = result_df.columns.tolist()
        chart_config = {
            "chart_type": "bar",
            "x_column": cols[0],
            "y_column": cols[1] if len(cols) > 1 else cols[0],
            "color_column": None,
            "title": question[:60],
            "x_label": cols[0],
            "y_label": cols[1] if len(cols) > 1 else cols[0],
            "sort_descending": True,
        }

    # ── Step 6: Build native chart descriptor ──────────────────────────────
    chart_json = _build_chart_descriptor(result_df, chart_config)

    # ── Step 7: Generate insight + followup chips ─────────────────────────
    insight = ""
    followup_chips = []
    try:
        insight = llm.generate_insight(
            question=question,
            chart_type=chart_config.get("chart_type", "bar"),
            sample_rows=result_df.head(8).to_dict(orient="records"),
        )
    except Exception:
        pass
    try:
        followup_chips = llm.generate_followup_chips(
            question=question,
            chart_type=chart_config.get("chart_type", "bar"),
            columns=result_df.columns.tolist(),
        )
    except Exception:
        pass

    # ── Step 8: Update conversation history ───────────────────────────────
    result_summary = f"{len(result_df)} rows. Columns: {result_df.columns.tolist()[:5]}"
    llm.add_to_history(question, sql, result_summary)
    _state["last_sql"] = sql
    _state["message_count"] += 1

    # ── Step 9: Persist to user history + session messages ─────────────────
    try:
        auth_module.save_history(
            user_id=user["user_id"],
            question=question,
            sql_query=sql,
            result_type="success",
            dataset_name=db.table_name,
            chart_type=chart_config.get("chart_type", "bar"),
            row_count=len(result_df),
        )
    except Exception:
        pass

    if session_id:
        try:
            auth_module.save_session_message(session_id, "user", {"content": question})
            auth_module.save_session_message(session_id, "assistant", {
                "type": "success",
                "title": chart_config.get("title", "Query Result"),
                "chart_type": chart_config.get("chart_type", "bar"),
                "chart_json": chart_json,
                "sql": sql,
                "row_count": len(result_df),
                "columns": result_df.columns.tolist(),
                "data": result_df.head(100).to_dict(orient="records"),
                "is_followup": followup,
                "chart_config": chart_config,
                "insight": insight,
                "followup_chips": followup_chips,
            })
        except Exception:
            pass

    return jsonify({
        "type": "success",
        "title": chart_config.get("title", "Query Result"),
        "chart_type": chart_config.get("chart_type", "bar"),
        "chart_json": chart_json,
        "sql": sql,
        "row_count": len(result_df),
        "columns": result_df.columns.tolist(),
        "data": result_df.head(100).to_dict(orient="records"),
        "is_followup": followup,
        "chart_config": chart_config,
        "insight": insight,
        "followup_chips": followup_chips,
    })


def _handle_multi_chart(question: str, db, llm, user, session_id):
    """Handle overview/dashboard queries by generating multiple distinct charts."""
    try:
        chart_queries = llm.generate_multi_chart(question, db.schema_info, [])
    except Exception:
        chart_queries = []

    if not chart_queries:
        return jsonify(_error_payload("Could not generate dashboard overview. Try a more specific question.", sql=None))

    charts = []
    for spec in chart_queries:
        raw_sql = spec.get("sql", "").strip()
        if not raw_sql:
            continue
        try:
            # Clean any accidental markdown the model may have left
            import re as _re
            raw_sql = _re.sub(r"```(?:sql)?\s*", "", raw_sql, flags=_re.IGNORECASE)
            raw_sql = _re.sub(r"```", "", raw_sql).strip().rstrip(";")

            result_df, error = db.execute_query(raw_sql)
            if error or result_df is None or result_df.empty:
                continue

            cols = result_df.columns.tolist()
            # Auto-detect numeric y column
            num_cols = result_df.select_dtypes(include="number").columns.tolist()
            y_col = num_cols[0] if num_cols else (cols[1] if len(cols) > 1 else cols[0])

            chart_config = {
                "chart_type": spec.get("chart_type", "bar"),
                "x_column": cols[0],
                "y_column": y_col,
                "color_column": None,
                "title": spec.get("title", "Chart"),
                "x_label": cols[0],
                "y_label": y_col,
                "sort_descending": True,
            }
            chart_json = _build_chart_descriptor(result_df, chart_config)
            if chart_json:
                charts.append({
                    "title": spec.get("title", "Chart"),
                    "chart_json": chart_json,
                    "sql": raw_sql,
                    "row_count": len(result_df),
                    "columns": cols,
                    "data": result_df.head(100).to_dict(orient="records"),
                })
        except Exception:
            continue

    if not charts:
        return jsonify(_error_payload("Dashboard generation failed — queries returned no data.", sql=None))

    insight = ""
    followup_chips = []
    sample_rows = db.df.head(8).to_dict(orient="records")
    try:
        insight = llm.generate_insight(question, "dashboard", sample_rows)
    except Exception:
        pass
    try:
        followup_chips = llm.generate_followup_chips(
            question, "dashboard", db.get_column_names()
        )
    except Exception:
        pass

    _state["message_count"] += 1

    if session_id:
        try:
            auth_module.save_session_message(session_id, "user", {"content": question})
            auth_module.save_session_message(session_id, "assistant", {
                "type": "multi_chart",
                "charts": charts,
                "insight": insight,
                "followup_chips": followup_chips,
                "is_followup": False,
            })
        except Exception:
            pass

    return jsonify({
        "type": "multi_chart",
        "charts": charts,
        "insight": insight,
        "followup_chips": followup_chips,
        "is_followup": False,
    })


@app.post("/api/clear-history")
def clear_history():
    user, err = _require_auth()
    if err:
        return err
    if _state["llm"]:
        _state["llm"].clear_history()
    _state["last_sql"] = None
    _state["message_count"] = 0
    return jsonify({"message": "Conversation history cleared."})


# ─── Native Chart Descriptor Builder ────────────────────────────────────────

def _build_chart_descriptor(result_df, chart_config: dict):
    """Build a Recharts-compatible chart descriptor directly from DataFrame + config."""
    chart_type = (chart_config.get("chart_type") or "bar").lower()
    cols = result_df.columns.tolist()
    if not cols:
        return None

    x_col = chart_config.get("x_column") or cols[0]
    y_col = chart_config.get("y_column") or (cols[1] if len(cols) > 1 else cols[0])
    color_col = chart_config.get("color_column")
    title = chart_config.get("title", "Query Result")
    x_label = chart_config.get("x_label") or x_col or ""
    y_label = chart_config.get("y_label") or y_col or ""
    sort_desc = chart_config.get("sort_descending", True)

    if x_col not in cols:
        x_col = cols[0]
    if y_col not in cols:
        y_col = cols[1] if len(cols) > 1 else cols[0]
    if color_col and color_col not in cols:
        color_col = None

    def safe_num(v):
        try:
            f = float(v)
            return 0 if (math.isnan(f) or math.isinf(f)) else f
        except Exception:
            return 0

    df = result_df.copy()
    if sort_desc and chart_type in ("bar", "horizontal_bar"):
        try:
            df = df.sort_values(y_col, ascending=(chart_type == "horizontal_bar"))
        except Exception:
            pass

    if chart_type in ("pie", "funnel"):
        data = [{"name": str(row[x_col]), "value": safe_num(row[y_col])} for _, row in df.iterrows()]
        return {"type": chart_type, "data": data, "title": title}

    if chart_type == "scatter":
        data = [{"x": safe_num(row[x_col]), "y": safe_num(row[y_col])} for _, row in df.iterrows()]
        return {"type": "scatter", "data": data, "title": title, "xLabel": x_label, "yLabel": y_label}

    if chart_type == "heatmap":
        # Auto-infer color_col (second categorical column) if not provided
        if not color_col or color_col not in cols:
            for c in cols:
                if c != x_col and c != y_col:
                    color_col = c
                    break

        # Auto-pick numeric y_col for heatmap
        num_cols = result_df.select_dtypes(include="number").columns.tolist()
        if y_col not in cols and num_cols:
            y_col = num_cols[0]

        if not color_col or color_col not in cols:
            chart_type = "bar"  # fall through to bar logic below
        else:
            row_vals = df[x_col].dropna().unique().tolist()
            col_vals = df[color_col].dropna().unique().tolist()
            cell_map = {}
            for _, row in df.iterrows():
                rk = str(row[x_col])
                ck = str(row[color_col])
                cell_map[(rk, ck)] = safe_num(row[y_col])
            all_vals = [v for v in cell_map.values() if v > 0]
            max_val = max(all_vals) if all_vals else 1
            cells = [
                {"row": rk, "col": ck, "value": cell_map.get((rk, ck), 0)}
                for rk in [str(v) for v in row_vals]
                for ck in [str(v) for v in col_vals]
            ]
            return {
                "type": "heatmap",
                "data": cells,
                "rows": [str(v) for v in row_vals],
                "cols": [str(v) for v in col_vals],
                "maxValue": max_val,
                "title": title,
                "xLabel": x_label,
                "yLabel": y_label,
            }

    # bar / horizontal_bar / line / area
    if color_col:
        series_vals = df[color_col].dropna().unique().tolist()
        chart_data_map = {}
        for _, row in df.iterrows():
            x_val = str(row[x_col])
            if x_val not in chart_data_map:
                chart_data_map[x_val] = {"name": x_val}
            chart_data_map[x_val][str(row[color_col])] = safe_num(row[y_col])
        data = list(chart_data_map.values())
        series = [str(s) for s in series_vals]
    else:
        series = [y_col]
        data = [{"name": str(row[x_col]), y_col: safe_num(row[y_col])} for _, row in df.iterrows()]

    return {
        "type": chart_type,
        "data": data,
        "series": series,
        "title": title,
        "xLabel": x_label,
        "yLabel": y_label,
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _error_payload(message: str, sql) -> dict:
    return {"type": "error", "message": message, "sql": sql, "is_followup": False}


def _build_metrics(df) -> list:
    return [{"label": "Records", "value": f"{len(df):,}"}]


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=True)
