import json
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.services.project_service import get_project_by_id
from app.services.llm_service import generate_query_info
from app.services.validation_service import validate_sql
from app.services.impact_service import run_explain
from app.repositories.query_repository import (
    create_query_history, 
    get_query_by_id, 
    update_query_execution_status, 
    get_query_history_by_project
)
from app.core.encryption import decrypt_password
from sqlalchemy import create_engine
from app.models.query import Query
from typing import List

def generate_query(db: Session, user_id: int, project_id: int, question: str) -> Query:
    project = get_project_by_id(db, user_id, project_id)
    
    try:
        gemini_res = generate_query_info(
            db_type=project.db_type,
            schema_summary=project.schema_summary or "",
            relationship_summary=project.relationship_summary or "",
            question=question
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM SQL Generation failed: {str(e)}"
        )

    val_result = validate_sql(gemini_res.primary_query, project.db_type)
    
    estimated_rows = None
    estimated_cost = None
    
    query_status = "success" if val_result["valid"] else "error"
    
    summary_dict = {
        "alternatives": [alt.model_dump() for alt in gemini_res.alternatives],
        "optimization_suggestions": gemini_res.optimization_suggestions,
        "risk_explanation": gemini_res.risk_explanation,
        "validation_errors": val_result["errors"],
        "validation_warnings": val_result["warnings"]
    }

    query_rec = create_query_history(
        db=db,
        project_id=project_id,
        question=question,
        generated_sql=gemini_res.primary_query,
        query_explanation=f"{gemini_res.explanation}\n\nRisk: {gemini_res.risk_explanation}",
        affected_tables=",".join(gemini_res.affected_tables),
        estimated_rows=estimated_rows,
        estimated_cost=estimated_cost,
        risk_level=gemini_res.risk_level,
        status=query_status
    )
    
    query_rec.result_summary = json.dumps(summary_dict)
    db.commit()
    db.refresh(query_rec)
    
    query_rec.alternatives = gemini_res.alternatives
    query_rec.optimization_suggestions = gemini_res.optimization_suggestions
    
    return query_rec

def execute_query(db: Session, user_id: int, query_id: int, sql_to_run: str = None) -> dict:
    query_rec = get_query_by_id(db, query_id)
    if not query_rec:
        raise HTTPException(status_code=404, detail="Query record not found")
        
    project = get_project_by_id(db, user_id, query_rec.project_id)
    
    sql = sql_to_run if sql_to_run else query_rec.generated_sql
    
    val_result = validate_sql(sql, project.db_type)
    if not val_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Safety check failed. Query execution blocked. Errors: {', '.join(val_result['errors'])}"
        )
        
    decrypted_pwd = decrypt_password(project.encrypted_db_password)
    if project.db_type == "postgres":
        conn_str = f"postgresql://{project.db_username}:{decrypted_pwd}@{project.host}:{project.port}/{project.database_name}"
    else:
        conn_str = f"mysql+pymysql://{project.db_username}:{decrypted_pwd}@{project.host}:{project.port}/{project.database_name}"
        
    engine = create_engine(conn_str)
    
    # Run explain to get estimated rows and cost for this execution
    estimated_rows = None
    estimated_cost = None
    try:
        from app.services.impact_service import run_explain
        estimated_rows, estimated_cost = run_explain(engine, project.db_type, sql)
    except Exception as e:
        print(f"Failed to run EXPLAIN on execute: {str(e)}")
        
    from app.services.execution_service import execute_database_query
    exec_result = execute_database_query(engine, sql, query_id=query_id)
    
    # Attach explain metrics
    exec_result["estimated_rows"] = estimated_rows
    exec_result["estimated_cost"] = estimated_cost
    
    original_summary = {}
    if query_rec.result_summary:
        try:
            original_summary = json.loads(query_rec.result_summary)
        except Exception:
            pass
            
    execution_summary = {
        "success": exec_result["success"],
        "error": exec_result["error"],
        "columns": exec_result["columns"],
        "data": exec_result["data"][:50]
    }
    original_summary["execution_data"] = execution_summary
    
    updated_rec = update_query_execution_status(
        db=db,
        query_id=query_id,
        status="success" if exec_result["success"] else "error",
        execution_time_ms=exec_result["execution_time_ms"],
        rows_returned=exec_result["rows_returned"],
        result_summary=json.dumps(original_summary)
    )
    
    # Also save estimated rows/cost to DB
    if updated_rec and exec_result["success"]:
        updated_rec.estimated_rows = estimated_rows
        updated_rec.estimated_cost = estimated_cost
        db.commit()
        
    return exec_result

def get_query_details(db: Session, user_id: int, query_id: int) -> Query:
    query_rec = get_query_by_id(db, query_id)
    if not query_rec:
        raise HTTPException(status_code=404, detail="Query history not found")
      
    get_project_by_id(db, user_id, query_rec.project_id)
    
    if query_rec.result_summary:
        try:
            summary_data = json.loads(query_rec.result_summary)
            if "alternatives" in summary_data:
                query_rec.alternatives = summary_data["alternatives"]
            if "optimization_suggestions" in summary_data:
                query_rec.optimization_suggestions = summary_data["optimization_suggestions"]
        except Exception:
            pass
    return query_rec

def get_project_query_history(db: Session, user_id: int, project_id: int) -> List[Query]:
    get_project_by_id(db, user_id, project_id)
    
    queries = get_query_history_by_project(db, project_id)
    for q in queries:
        if q.result_summary:
            try:
                summary_data = json.loads(q.result_summary)
                if "alternatives" in summary_data:
                    q.alternatives = summary_data["alternatives"]
                if "optimization_suggestions" in summary_data:
                    q.optimization_suggestions = summary_data["optimization_suggestions"]
            except Exception:
                pass
    return queries
