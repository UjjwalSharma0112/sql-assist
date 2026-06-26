from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from typing import Dict, List, Any

class PostgresClient:
    def __init__(self, host: str, port: int, database: str, username: str, password: str):
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.connection_string = f"postgresql://{username}:{password}@{host}:{port}/{database}"

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
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in conn.execute(tables_query).fetchall()]

            # 2. Fetch columns
            columns_query = text("""
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            """)
            columns_rows = conn.execute(columns_query).fetchall()
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
                SELECT kcu.table_name, kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_schema = 'public';
            """)
            pks = conn.execute(pk_query).fetchall()
            pks_by_table = {}
            for tbl, col in pks:
                if tbl not in pks_by_table:
                    pks_by_table[tbl] = set()
                pks_by_table[tbl].add(col)

            # 4. Fetch foreign keys
            fk_query = text("""
                SELECT
                    kcu.table_name AS table_name,
                    kcu.column_name AS column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public';
            """)
            fks = conn.execute(fk_query).fetchall()
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
