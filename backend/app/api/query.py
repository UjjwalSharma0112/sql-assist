from fastapi import APIRouter, Depends, status, Query as FastAPIQuery
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.query import QueryGenerateRequest, QueryResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.services import query_service
from typing import List

router = APIRouter(
    prefix="/query",
    tags=["Queries"]
)

from pydantic import BaseModel
from app.services.project_service import get_project_by_id

class QueryCheckRequest(BaseModel):
    project_id: int
    sql: str

@router.post("/validate")
def validate_query(
    data: QueryCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_by_id(db, user_id=current_user.id, project_id=data.project_id)
    from app.services.validation_service import validate_sql
    return validate_sql(data.sql, project.db_type)

@router.post("/analyze")
def analyze_query(
    data: QueryCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_by_id(db, user_id=current_user.id, project_id=data.project_id)
    from app.services.validation_service import validate_sql
    val = validate_sql(data.sql, project.db_type)
    
    is_modifying = any(k in data.sql.upper() for k in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"])
    
    return {
        "risk_level": "HIGH" if is_modifying else "LOW",
        "explanation": f"This query will {'modify data in' if is_modifying else 'read from'} the database.",
        "warnings": val["warnings"],
        "estimated_rows": None,
        "estimated_cost": None
    }

@router.post("/explain")
def explain_query(
    data: QueryCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_by_id(db, user_id=current_user.id, project_id=data.project_id)
    import sqlglot
    from sqlglot import parse_one, exp
    
    dialect = 'postgres' if project.db_type == 'postgres' else 'mysql'
    try:
        parsed = parse_one(data.sql, read=dialect)
        tables = [t.name for t in parsed.find_all(exp.Table)]
        where = parsed.find(exp.Where)
        where_str = str(where.this) if where else ""
        
        # Simple summary
        summary = f"Reads from {', '.join(tables)}"
        if where_str:
            summary += f" where {where_str}"
        
        return {
            "summary": summary,
            "affected_tables": list(set(tables)),
            "clauses": {"where": where_str}
        }
    except Exception:
        return {
            "summary": "Could not parse SQL query.",
            "affected_tables": [],
            "clauses": {"where": ""}
        }

@router.post("/generate", response_model=QueryResponse, status_code=status.HTTP_201_CREATED)
def generate_query(
    data: QueryGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return query_service.generate_query(
        db=db,
        user_id=current_user.id,
        project_id=data.project_id,
        question=data.question
    )

@router.get("/history", response_model=List[QueryResponse])
def get_history(
    project_id: int = FastAPIQuery(..., description="Project ID to filter query history"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return query_service.get_project_query_history(
        db=db,
        user_id=current_user.id,
        project_id=project_id
    )

@router.get("/{query_id}", response_model=QueryResponse)
def get_query(
    query_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return query_service.get_query_details(
        db=db,
        user_id=current_user.id,
        query_id=query_id
    )
