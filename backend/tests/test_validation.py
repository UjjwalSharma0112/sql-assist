from app.services.validation_service import validate_sql

def test_syntax_errors():
    res = validate_sql("SELECT * FROM users WHERE", "postgres")
    assert not res["valid"]
    assert any("Syntax Error" in err for err in res["errors"])

    res = validate_sql("SELECT * FROM users", "postgres")
    assert res["valid"]
    assert not res["errors"]

def test_blocked_ddl():
    # DROP
    res = validate_sql("DROP TABLE users", "postgres")
    assert not res["valid"]
    assert any("blocked" in err.lower() for err in res["errors"])

    # ALTER
    res = validate_sql("ALTER TABLE users ADD COLUMN age INT", "postgres")
    assert not res["valid"]
    assert any("blocked" in err.lower() for err in res["errors"])

    # TRUNCATE
    res = validate_sql("TRUNCATE TABLE logs", "postgres")
    assert not res["valid"]
    assert any("blocked" in err.lower() for err in res["errors"])

def test_missing_where():
    # SELECT (safe, doesn't require WHERE)
    res = validate_sql("SELECT * FROM users", "postgres")
    assert res["valid"]
    
    # UPDATE without WHERE
    res = validate_sql("UPDATE users SET active = false", "postgres")
    assert res["valid"]
    assert any("missing a WHERE clause" in warn for warn in res["warnings"])

    # UPDATE with WHERE
    res = validate_sql("UPDATE users SET active = false WHERE id = 1", "postgres")
    assert res["valid"]

    # DELETE without WHERE
    res = validate_sql("DELETE FROM logs", "postgres")
    assert res["valid"]
    assert any("missing a WHERE clause" in warn for warn in res["warnings"])

    # DELETE with WHERE
    res = validate_sql("DELETE FROM logs WHERE created_at < NOW()", "postgres")
    assert res["valid"]

def test_cartesian_joins():
    # CROSS JOIN
    res = validate_sql("SELECT * FROM a CROSS JOIN b", "postgres")
    assert res["valid"]
    assert any("CROSS JOIN" in warn for warn in res["warnings"])

    # JOIN without ON
    res = validate_sql("SELECT * FROM a JOIN b", "postgres")
    assert res["valid"]
    assert any("without a JOIN condition" in warn for warn in res["warnings"])

    # Comma FROM
    res = validate_sql("SELECT * FROM a, b", "postgres")
    assert res["valid"]
    assert any("JOIN condition" in warn for warn in res["warnings"])


    # Valid INNER JOIN with ON
    res = validate_sql("SELECT * FROM a JOIN b ON a.id = b.a_id", "postgres")
    assert res["valid"]
    assert not res["warnings"]
