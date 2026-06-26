from typing import Dict, Any

def build_schema_summary(schema_json: Dict[str, Any]) -> str:
    summary_parts = []
    tables = schema_json.get("tables", [])
    for table in tables:
        table_name = table.get("name")
        columns = table.get("columns", [])
        foreign_keys = table.get("foreign_keys", [])
        
        # Map column name to FK string
        fk_map = {}
        for fk in foreign_keys:
            col = fk.get("column")
            ref_tbl = fk.get("ref_table")
            ref_col = fk.get("ref_column")
            fk_map[col] = f"FK->{ref_tbl}.{ref_col}"
            
        col_parts = []
        for col in columns:
            col_name = col.get("name")
            is_pk = col.get("primary_key", False)
            
            suffix = ""
            if is_pk:
                suffix = " PK"
            elif col_name in fk_map:
                suffix = f" {fk_map[col_name]}"
                
            col_parts.append(f"  {col_name}{suffix}")
            
        col_str = ",\n".join(col_parts)
        summary_parts.append(f"{table_name}(\n{col_str}\n)")
        
    return "\n\n".join(summary_parts)
