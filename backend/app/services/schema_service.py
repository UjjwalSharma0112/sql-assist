from typing import Dict, Tuple, Any
from app.clients.postgres_client import PostgresClient
from app.clients.mysql_client import MySQLClient
from app.utils.schema_summary import build_schema_summary
from app.utils.relationship_builder import build_relationship_summary

def get_client(db_type: str, host: str, port: int, database: str, username: str, password: str):
    if db_type == "postgres":
        return PostgresClient(host, port, database, username, password)
    elif db_type == "mysql":
        return MySQLClient(host, port, database, username, password)
    else:
        raise ValueError(f"Unsupported database type: {db_type}")

def test_db_connection(db_type: str, host: str, port: int, database: str, username: str, password: str) -> bool:
    try:
        client = get_client(db_type, host, port, database, username, password)
        return client.test_connection()
    except Exception:
        return False

def extract_db_schema(db_type: str, host: str, port: int, database: str, username: str, password: str) -> Tuple[Dict[str, Any], str, str]:
    client = get_client(db_type, host, port, database, username, password)
    schema_json = client.extract_schema()
    schema_summary = build_schema_summary(schema_json)
    relationship_summary = build_relationship_summary(schema_json)
    return schema_json, schema_summary, relationship_summary
