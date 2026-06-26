from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from typing import Dict, List, Any

class MySQLClient:
    def __init__(self, host: str, port: int, database: str, username: str, password: str):
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.connection_string = f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}"

    def get_engine(self) -> Engine:
        return create_engine(self.connection_string, connect_args={"connect_timeout": 5})

    def test_connection(self) -> bool:
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    def extract_schema(self) -> Dict[str, Any]:
        engine = self.get_engine()
        schema = {"tables": []}
        
        with engine.connect() as conn:
            # 1. Fetch tables
            tables_query = text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = :db
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in conn.execute(tables_query, {"db": self.database}).fetchall()]

            # 2. Fetch columns
            columns_query = text("""
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = :db
                ORDER BY table_name, ordinal_position;
            """)
            columns_rows = conn.execute(columns_query, {"db": self.database}).fetchall()
            columns_by_table = {}
            for row in columns_rows:
                tbl, col, dtype, is_null = row
                if tbl not in columns_by_table:
                    columns_by_table[tbl] = []
                columns_by_table[tbl].append({
                    "name": col,
                    "type": dtype,
                    "nullable": is_null == "YES"
                })

            # 3. Fetch primary keys
            pk_query = text("""
                SELECT table_name, column_name
                FROM information_schema.key_column_usage
                WHERE table_schema = :db
                  AND constraint_name = 'PRIMARY';
            """)
            pks = conn.execute(pk_query, {"db": self.database}).fetchall()
            pks_by_table = {}
            for tbl, col in pks:
                if tbl not in pks_by_table:
                    pks_by_table[tbl] = set()
                pks_by_table[tbl].add(col)

            # 4. Fetch foreign keys
            fk_query = text("""
                SELECT
                    table_name,
                    column_name,
                    referenced_table_name AS foreign_table_name,
                    referenced_column_name AS foreign_column_name
                FROM
                    information_schema.key_column_usage
                WHERE table_schema = :db
                  AND referenced_table_name IS NOT NULL;
            """)
            fks = conn.execute(fk_query, {"db": self.database}).fetchall()
            fks_by_table = {}
            for tbl, col, ref_tbl, ref_col in fks:
                if tbl not in fks_by_table:
                    fks_by_table[tbl] = []
                fks_by_table[tbl].append({
                    "column": col,
                    "ref_table": ref_tbl,
                    "ref_column": ref_col
                })

            # Combine everything
            for table_name in tables:
                table_cols = columns_by_table.get(table_name, [])
                table_pks = pks_by_table.get(table_name, set())
                table_fks = fks_by_table.get(table_name, [])

                for col in table_cols:
                    col["primary_key"] = col["name"] in table_pks

                schema["tables"].append({
                    "name": table_name,
                    "columns": table_cols,
                    "foreign_keys": table_fks
                })

        return schema
