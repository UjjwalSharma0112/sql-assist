from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.query import QueryExecuteResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.services import query_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/query",
    tags=["Execution"]
)

class QueryExecutePayload(BaseModel):
    query_id: int
    sql: Optional[str] = None

@router.post("/execute", response_model=QueryExecuteResponse)
def execute_query(
    payload: QueryExecutePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = query_service.execute_query(
        db=db,
        user_id=current_user.id,
        query_id=payload.query_id,
        sql_to_run=payload.sql
    )
    return res

class TransactionActionPayload(BaseModel):
    query_id: int

@router.post("/rollback")
def rollback_transaction(
    payload: TransactionActionPayload,
    current_user: User = Depends(get_current_user)
):
    from app.services.execution_service import rollback_query_transaction
    success = rollback_query_transaction(payload.query_id)
    return {"success": success, "message": "Transaction rolled back" if success else "No active transaction found"}

@router.post("/commit")
def commit_transaction(
    payload: TransactionActionPayload,
    current_user: User = Depends(get_current_user)
):
    from app.services.execution_service import commit_query_transaction
    success = commit_query_transaction(payload.query_id)
    return {"success": success, "message": "Transaction committed" if success else "No active transaction found"}
