"""
KMS MCP Server - Database Helper
PostgreSQL connection pool with psycopg2.
"""
import os
import psycopg2
import psycopg2.pool
import psycopg2.extras
from contextlib import contextmanager

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://kms_user:changeme@127.0.0.1:5432/kms"
)

# Connection pool (min 2, max 10 connections)
_pool = None


def get_pool():
    """Get or create the connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=DATABASE_URL,
        )
    return _pool


@contextmanager
def get_conn():
    """Context manager that gets a connection from the pool and returns it."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def query(sql: str, params: tuple = None) -> list[dict]:
    """Execute a SELECT and return all rows as list of dicts."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]


def query_one(sql: str, params: tuple = None) -> dict | None:
    """Execute a SELECT and return one row as dict, or None."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute(sql: str, params: tuple = None) -> int:
    """Execute an INSERT/UPDATE/DELETE and return rowcount."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.rowcount


def execute_returning(sql: str, params: tuple = None) -> dict | None:
    """Execute an INSERT/UPDATE with RETURNING and return the row."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None


def close_pool():
    """Close all connections in the pool."""
    global _pool
    if _pool and not _pool.closed:
        _pool.closeall()
        _pool = None
