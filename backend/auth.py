"""
auth.py — User authentication, sessions, and per-user query history.

Uses a separate SQLite file (auth.db) to keep auth concerns isolated
from the data/analytics database.
"""

import sqlite3
import secrets
import re
import json
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash

AUTH_DB_PATH = Path(__file__).parent / "auth.db"

# Username: 3-20 chars, alphanumeric + underscore only
_USERNAME_RE = re.compile(r'^[a-zA-Z0-9_]{3,20}$')


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(AUTH_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create auth tables if they don't exist."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT    UNIQUE NOT NULL COLLATE NOCASE,
            password_hash   TEXT    NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token       TEXT    PRIMARY KEY,
            user_id     INTEGER NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS query_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            question     TEXT    NOT NULL,
            sql_query    TEXT,
            result_type  TEXT,
            dataset_name TEXT,
            chart_type   TEXT,
            row_count    INTEGER DEFAULT 0,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            dataset_name  TEXT    NOT NULL,
            message_count INTEGER DEFAULT 0,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS session_messages (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id   INTEGER NOT NULL,
            role         TEXT    NOT NULL,
            content_json TEXT    NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    conn.close()


# ─── Auth actions ────────────────────────────────────────────────────────────

def register(username: str, password: str) -> dict:
    """Register a new user and return their session token."""
    username = username.strip()
    if not _USERNAME_RE.match(username):
        raise ValueError("Username must be 3–20 alphanumeric characters or underscores.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    conn = _get_conn()
    try:
        pw_hash = generate_password_hash(password)
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, pw_hash),
        )
        user_id = cursor.lastrowid
        conn.commit()
        token = _new_session(conn, user_id)
        conn.close()
        return {"user_id": user_id, "username": username, "token": token}
    except sqlite3.IntegrityError:
        conn.close()
        raise ValueError("Username is already taken.")


def login(username: str, password: str) -> dict:
    """Verify credentials and return a new session token."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE",
        (username.strip(),),
    ).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        conn.close()
        raise ValueError("Invalid username or password.")
    token = _new_session(conn, row["id"])
    conn.close()
    return {"user_id": row["id"], "username": row["username"], "token": token}


def logout(token: str):
    """Invalidate a session token."""
    conn = _get_conn()
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()


def get_user(token: str) -> dict | None:
    """Return user dict for a valid token, or None if invalid/expired."""
    if not token:
        return None
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT u.id AS user_id, u.username
        FROM users u
        JOIN sessions s ON s.user_id = u.id
        WHERE s.token = ?
        """,
        (token,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


# ─── Query history ────────────────────────────────────────────────────────────

def save_history(
    user_id: int,
    question: str,
    sql_query: str,
    result_type: str,
    dataset_name: str,
    chart_type: str,
    row_count: int,
):
    conn = _get_conn()
    conn.execute(
        """
        INSERT INTO query_history
            (user_id, question, sql_query, result_type, dataset_name, chart_type, row_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, question, sql_query, result_type, dataset_name, chart_type, row_count),
    )
    conn.commit()
    conn.close()


def get_history(user_id: int, limit: int = 30) -> list:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT id, question, sql_query, result_type, dataset_name, chart_type, row_count, created_at
        FROM query_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── Private helpers ──────────────────────────────────────────────────────────

def _new_session(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_hex(32)
    conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()
    return token


# ─── Chat sessions ─────────────────────────────────────────────────────────────

def create_chat_session(user_id: int, dataset_name: str) -> int:
    """Create a new chat session for a user and return its id."""
    conn = _get_conn()
    cursor = conn.execute(
        "INSERT INTO chat_sessions (user_id, dataset_name) VALUES (?, ?)",
        (user_id, dataset_name),
    )
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id


def save_session_message(session_id: int, role: str, content: dict):
    """Append a message to a chat session and increment its counter."""
    conn = _get_conn()
    conn.execute(
        "INSERT INTO session_messages (session_id, role, content_json) VALUES (?, ?, ?)",
        (session_id, role, json.dumps(content)),
    )
    conn.execute(
        """UPDATE chat_sessions
           SET message_count = message_count + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (session_id,),
    )
    conn.commit()
    conn.close()


def delete_chat_session(session_id: int, user_id: int) -> bool:
    """Delete a session owned by user_id. Returns True if deleted, False if not found."""
    conn = _get_conn()
    cursor = conn.execute(
        "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    )
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_chat_sessions(user_id: int, limit: int = 30) -> list:
    """Return summary list of chat sessions for a user, newest first."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT id, dataset_name, message_count, created_at, updated_at
           FROM chat_sessions
           WHERE user_id = ?
           ORDER BY updated_at DESC
           LIMIT ?""",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_chat_session_messages(session_id: int, user_id: int) -> list | None:
    """Return all messages for a session owned by user_id, or None if not found."""
    conn = _get_conn()
    session = conn.execute(
        "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    ).fetchone()
    if not session:
        conn.close()
        return None
    rows = conn.execute(
        "SELECT role, content_json FROM session_messages WHERE session_id = ? ORDER BY id ASC",
        (session_id,),
    ).fetchall()
    conn.close()
    messages = []
    for idx, row in enumerate(rows):
        try:
            content = json.loads(row["content_json"])
        except Exception:
            content = {"content": str(row["content_json"])}
        messages.append({"id": idx + 1, "role": row["role"], **content})
    return messages
