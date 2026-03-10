"""
database.py — CSV → SQLite engine with query execution and schema introspection.
Handles loading any CSV into an in-memory SQLite database so Gemini-generated
SQL can be executed instantly.
"""

import sqlite3
import pandas as pd
import io
from pathlib import Path
from typing import Optional


# ─── Default dataset bundled with the app ────────────────────────────────────
# Primary location: backend/data/ (used in production / Railway)
# Fallback: three levels up (original local dev layout)
_DATA_DIR = Path(__file__).parent / "data" / "Nykaa Digital Marketing.csv"
_LEGACY_CSV = Path(__file__).parent.parent.parent / "Nykaa Digital Marketing.csv"
DEFAULT_CSV = _DATA_DIR if _DATA_DIR.exists() else _LEGACY_CSV
DEFAULT_TABLE = "campaigns"

# ─── Persistent SQLite file path ─────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "nykaa_data.db"


class DatabaseEngine:
    """
    Manages an in-memory SQLite database loaded from a CSV file.
    Provides schema metadata, SQL execution, and query validation.
    """

    def __init__(self):
        self.conn: Optional[sqlite3.Connection] = None
        self.table_name: str = DEFAULT_TABLE
        self.df: Optional[pd.DataFrame] = None
        self.schema_info: str = ""
        self.sample_values: dict = {}
        # Open (or create) the persistent SQLite file
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)

    # ─── Loaders ─────────────────────────────────────────────────────────────

    def load_default(self) -> bool:
        """Load the bundled Nykaa dataset."""
        for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
            try:
                df = pd.read_csv(DEFAULT_CSV, encoding=encoding)
                return self._ingest(df, DEFAULT_TABLE)
            except UnicodeDecodeError:
                continue
            except Exception as e:
                raise RuntimeError(f"Could not load default dataset: {e}")
        raise RuntimeError("Could not load default dataset: unable to detect file encoding")

    def load_from_upload(self, uploaded_bytes: bytes, filename: str) -> bool:
        """Load a user-uploaded CSV file."""
        try:
            df = pd.read_csv(io.BytesIO(uploaded_bytes))
            # Sanitize table name from filename
            table = Path(filename).stem.lower().replace(" ", "_").replace("-", "_")
            table = "".join(c for c in table if c.isalnum() or c == "_")
            if not table or table[0].isdigit():
                table = "user_data"
            return self._ingest(df, table)
        except Exception as e:
            raise RuntimeError(f"Could not load uploaded CSV: {e}")

    def _ingest(self, df: pd.DataFrame, table_name: str) -> bool:
        """Core ingestion: clean DataFrame → SQLite."""
        # Clean column names (remove spaces, special chars)
        df.columns = [
            c.strip().replace(" ", "_").replace("-", "_").replace("/", "_")
            for c in df.columns
        ]

        # Drop fully empty rows
        df = df.dropna(how="all")

        # Infer better types where possible
        for col in df.columns:
            # Try numeric conversion
            try:
                df[col] = pd.to_numeric(df[col])
            except (ValueError, TypeError):
                pass

        self.df = df
        self.table_name = table_name

        # Persist to the on-disk SQLite file (replace existing table)
        df.to_sql(table_name, self.conn, if_exists="replace", index=False)
        self.conn.commit()

        # Build schema documentation for LLM
        self._build_schema_info()
        return True

    # ─── Schema Introspection ─────────────────────────────────────────────────

    def _build_schema_info(self):
        """Build a detailed schema string + sample values for the LLM prompt."""
        cursor = self.conn.cursor()
        cursor.execute(f"PRAGMA table_info({self.table_name})")
        cols_info = cursor.fetchall()

        lines = [
            f"Table: {self.table_name}",
            f"Total rows: {len(self.df)}",
            "",
            "Columns:",
        ]

        sample_vals = {}
        for _, name, dtype, *_ in cols_info:
            col_series = self.df[name]
            n_unique = col_series.nunique()

            # For categoricals, list unique values (up to 15)
            if n_unique <= 20 and col_series.dtype == object:
                uniq = sorted(col_series.dropna().unique().tolist())[:20]
                sample_vals[name] = uniq
                lines.append(f"  - {name} ({dtype}): categorical, values = {uniq}")
            elif col_series.dtype in ["int64", "float64"]:
                mn, mx, mean = (
                    round(float(col_series.min()), 2),
                    round(float(col_series.max()), 2),
                    round(float(col_series.mean()), 2),
                )
                lines.append(
                    f"  - {name} ({dtype}): numeric, min={mn}, max={mx}, avg={mean}"
                )
            else:
                sample = col_series.dropna().head(3).tolist()
                sample_vals[name] = sample
                lines.append(
                    f"  - {name} ({dtype}): text, sample values = {sample}"
                )

        self.schema_info = "\n".join(lines)
        self.sample_values = sample_vals

    # ─── Query Execution ──────────────────────────────────────────────────────

    def execute_query(self, sql: str) -> tuple[pd.DataFrame | None, str | None]:
        """
        Execute a SQL query.
        Returns (DataFrame, None) on success or (None, error_message) on failure.
        """
        if not self.conn:
            return None, "Database not initialised. Please load a dataset first."

        try:
            df = pd.read_sql_query(sql, self.conn)

            # Check if the LLM returned a 'cannot answer' signal
            if "error_message" in df.columns and len(df) == 1:
                val = str(df.iloc[0, 0]).upper()
                if "CANNOT_ANSWER" in val:
                    return None, "cannot_answer"

            if df.empty:
                return None, "The query returned no results for the given filters."

            return df, None

        except Exception as e:
            return None, str(e)

    def get_column_names(self) -> list[str]:
        if self.df is not None:
            return self.df.columns.tolist()
        return []

    def load_from_existing_db(self, table_name: str = DEFAULT_TABLE) -> bool:
        """
        Re-hydrate the engine from an already-persisted table in the SQLite file.
        Returns True if the table exists and was loaded, False otherwise.
        """
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,),
            )
            if cursor.fetchone() is None:
                return False
            self.df = pd.read_sql_query(f"SELECT * FROM {table_name}", self.conn)
            self.table_name = table_name
            self._build_schema_info()
            return True
        except Exception as e:
            return False

    def is_ready(self) -> bool:
        return self.conn is not None and self.df is not None
