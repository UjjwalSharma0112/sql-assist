import time
import datetime
import decimal
import uuid
from sqlalchemy import text
from sqlalchemy.engine import Engine
from typing import Dict, Any, List

# Store active transactions: query_id -> (connection, transaction, timestamp)
active_transactions = {}

def serialize_value(val):
    if isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
        return val.isoformat()
    if isinstance(val, decimal.Decimal):
        return float(val)
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')
    return val

def cleanup_idle_transactions(timeout_seconds=300):
    now = datetime.datetime.now()
    expired = []
    for q_id, item in list(active_transactions.items()):
        conn, trans, timestamp = item
        if (now - timestamp).total_seconds() > timeout_seconds:
            try:
                trans.rollback()
                conn.close()
            except Exception:
                pass
            expired.append(q_id)
    for q_id in expired:
        active_transactions.pop(q_id, None)

def execute_database_query(engine: Engine, sql: str, query_id: int = None) -> Dict[str, Any]:
    """
    Executes a SQL query in a transaction, measuring execution time.
    If query_id is provided and the query is a DML/DDL (modifying) query,
    the transaction is kept open for later rollback/commit.
    """
    cleanup_idle_transactions()

    # If there is already an active transaction for this query_id, roll it back and close it
    if query_id and query_id in active_transactions:
        try:
            conn, trans, _ = active_transactions.pop(query_id)
            trans.rollback()
            conn.close()
        except Exception:
            pass

    start_time = time.perf_counter()
    rows_data: List[Dict[str, Any]] = []
    columns: List[str] = []
    error_message = None
    rows_returned = 0

    is_dml = any(keyword in sql.upper() for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"])

    conn = engine.connect()
    trans = conn.begin()
    try:
        res = conn.execute(text(sql))
        if res.returns_rows:
            columns = list(res.keys())
            fetched = res.fetchmany(500)
            rows_returned = len(fetched)
            for row in fetched:
                row_dict = {}
                for col, val in zip(columns, row):
                    row_dict[col] = serialize_value(val)
                rows_data.append(row_dict)
        else:
            rows_returned = res.rowcount if res.rowcount != -1 else 0
        
        if query_id and is_dml:
            # Keep transaction open
            active_transactions[query_id] = (conn, trans, datetime.datetime.now())
        else:
            # Read-only or auto-commit
            trans.commit()
            conn.close()
            
    except Exception as e:
        error_message = str(e)
        try:
            trans.rollback()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass

    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000.0

    return {
        "success": error_message is None,
        "error": error_message,
        "execution_time_ms": execution_time_ms,
        "rows_returned": rows_returned,
        "columns": columns,
        "data": rows_data,
        "transactional": is_dml and error_message is None
    }

def rollback_query_transaction(query_id: int) -> bool:
    cleanup_idle_transactions()
    if query_id in active_transactions:
        try:
            conn, trans, _ = active_transactions.pop(query_id)
            trans.rollback()
            conn.close()
            return True
        except Exception:
            pass
    return False

def commit_query_transaction(query_id: int) -> bool:
    cleanup_idle_transactions()
    if query_id in active_transactions:
        try:
            conn, trans, _ = active_transactions.pop(query_id)
            trans.commit()
            conn.close()
            return True
        except Exception:
            pass
    return False
