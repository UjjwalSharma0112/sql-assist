import sqlglot
from sqlglot import parse_one, exp
from typing import Dict, Any

def validate_sql(sql: str, db_type: str) -> Dict[str, Any]:
    # Map db_type to sqlglot dialect
    dialect = 'postgres' if db_type == 'postgres' else 'mysql'
    
    result = {
        "valid": True,
        "errors": [],
        "warnings": []
    }
    
    try:
        parsed = parse_one(sql, read=dialect)
    except sqlglot.errors.ParseError as e:
        result["valid"] = False
        result["errors"].append(f"SQL Syntax Error: {str(e)}")
        return result
    except Exception as e:
        result["valid"] = False
        result["errors"].append(f"Error parsing SQL: {str(e)}")
        return result

    # Check the parsed expression tree for dangerous actions or warnings
    for node in parsed.walk():
        node_type = node.__class__.__name__.lower()
        
        # Block DDL/dangerous commands
        if "drop" in node_type or "alter" in node_type or "truncate" in node_type:
            result["valid"] = False
            result["errors"].append(f"Dangerous command '{node.__class__.__name__.upper()}' is blocked.")
            
        # Check UPDATE / DELETE for missing WHERE clauses
        if isinstance(node, exp.Update):
            if not node.args.get("where"):
                result["warnings"].append("UPDATE statement is missing a WHERE clause. This will update all rows in the table!")
                
        if isinstance(node, exp.Delete):
            if not node.args.get("where"):
                result["warnings"].append("DELETE statement is missing a WHERE clause. This will delete all rows in the table!")
                
        # Check for Cartesian joins / cross joins
        if isinstance(node, exp.Join):
            join_method = node.args.get("method")
            join_kind = node.args.get("kind")
            if (join_method and str(join_method).upper() == "CROSS") or (join_kind and str(join_kind).upper() == "CROSS"):
                result["warnings"].append("Query contains a CROSS JOIN, which might return a Cartesian product and cause performance degradation.")
            elif not node.args.get("on") and not node.args.get("using"):
                result["warnings"].append("Query contains a JOIN without a JOIN condition (ON/USING), which acts as a Cartesian product.")
                
        if isinstance(node, exp.Select):
            from_exp = node.args.get("from")
            if from_exp:
                expressions = from_exp.expressions
                if len(expressions) > 1:
                    result["warnings"].append("Query contains multiple tables in the FROM clause without explicit joins, leading to an implicit Cartesian product.")

    return result
