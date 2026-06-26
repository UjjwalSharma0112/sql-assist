from typing import Dict, Any

def build_relationship_summary(schema_json: Dict[str, Any]) -> str:
    relations = []
    tables = schema_json.get("tables", [])
    for table in tables:
        tbl_name = table.get("name")
        for fk in table.get("foreign_keys", []):
            col = fk.get("column")
            ref_tbl = fk.get("ref_table")
            ref_col = fk.get("ref_column")
            relations.append(f"- {tbl_name}.{col} references {ref_tbl}.{ref_col}")
            
    if not relations:
        return "No relationships defined."
    return "\n".join(relations)
