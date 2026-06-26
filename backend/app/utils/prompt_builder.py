def build_generation_prompt(
    db_type: str,
    schema_summary: str,
    relationship_summary: str,
    question: str
) -> str:
    return f"""You are an expert SQL engineer. Your task is to convert the natural language question below into valid SQL.

Database Type: {db_type}

Database Schema:
{schema_summary}

Database Relationships:
{relationship_summary}

User Question:
{question}

Requirements:
1. Generate valid, syntax-correct, and highly efficient {db_type} query.
2. Prefer efficient joins using the defined relationships.
3. Assess the security risk of the query (e.g. SELECT is usually LOW, SELECT * might be MEDIUM, UPDATE/DELETE without WHERE is HIGH/CRITICAL, DDL is CRITICAL).
4. Identify all tables affected/read by the query.
5. Provide multiple alternative SQL queries to solve the same question (if possible/applicable).
6. Provide optimization suggestions (e.g. index recommendations, join order tips).
"""
