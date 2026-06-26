import json
from sqlalchemy import text
from sqlalchemy.engine import Engine
from typing import Tuple, Optional

def run_explain(engine: Engine, db_type: str, sql: str) -> Tuple[Optional[int], Optional[float]]:
    """
    Runs EXPLAIN on the SQL query to extract estimated rows and cost.
    Does NOT execute the query (never uses EXPLAIN ANALYZE for DML/DQL).
    """
    try:
        with engine.connect() as conn:
            if db_type == "postgres":
                clean_sql = sql.strip().rstrip(";")
                explain_sql = f"EXPLAIN (FORMAT JSON) {clean_sql}"
                raw_result = conn.execute(text(explain_sql)).scalar()
                
                if isinstance(raw_result, str):
                    plan_data = json.loads(raw_result)
                else:
                    plan_data = raw_result
                
                if plan_data and isinstance(plan_data, list):
                    plan = plan_data[0].get("Plan", {})
                    estimated_rows = plan.get("Plan Rows")
                    estimated_cost = plan.get("Total Cost")
                    if estimated_cost is not None:
                        estimated_cost = float(estimated_cost)
                    return estimated_rows, estimated_cost
                    
            elif db_type == "mysql":
                clean_sql = sql.strip().rstrip(";")
                explain_sql = f"EXPLAIN FORMAT=JSON {clean_sql}"
                try:
                    row = conn.execute(text(explain_sql)).fetchone()
                    if row:
                        json_str = row[0]
                        plan_data = json.loads(json_str)
                        query_block = plan_data.get("query_block", {})
                        
                        cost_info = query_block.get("cost_info", {})
                        estimated_cost = float(cost_info.get("query_cost", 0.0))
                        
                        # Find rows_examined_per_scan in query block recursively
                        def find_rows(obj):
                            rows = 0
                            if isinstance(obj, dict):
                                if "rows_examined_per_scan" in obj:
                                    rows += int(obj["rows_examined_per_scan"])
                                for k, v in obj.items():
                                    rows += find_rows(v)
                            elif isinstance(obj, list):
                                for item in obj:
                                    rows += find_rows(item)
                            return rows
                        
                        estimated_rows = find_rows(query_block)
                        if estimated_rows == 0:
                            estimated_rows = None
                        return estimated_rows, estimated_cost
                except Exception:
                    # Fallback to standard tabular EXPLAIN
                    explain_sql = f"EXPLAIN {clean_sql}"
                    db_res = conn.execute(text(explain_sql))
                    rows = db_res.fetchall()
                    cols = [desc[0].lower() for desc in db_res.cursor.description]
                    if 'rows' in cols:
                        idx = cols.index('rows')
                        total_rows = 0
                        for r in rows:
                            val = r[idx]
                            if val is not None:
                                total_rows += int(val)
                        return total_rows, 0.0

    except Exception as e:
        print(f"Error executing EXPLAIN: {str(e)}")
        
    return None, None
