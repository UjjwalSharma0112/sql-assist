from sqlalchemy.orm import Session
from app.models.query import Query
from sqlalchemy import select
from typing import List, Optional

def create_query_history(
    db: Session,
    project_id: int,
    question: str,
    generated_sql: str,
    query_explanation: str,
    affected_tables: str,
    estimated_rows: Optional[int],
    estimated_cost: Optional[float],
    risk_level: str,
    status: str
) -> Query:
    query_rec = Query(
        project_id=project_id,
        question=question,
        generated_sql=generated_sql,
        query_explanation=query_explanation,
        affected_tables=affected_tables,
        estimated_rows=estimated_rows,
        estimated_cost=estimated_cost,
        risk_level=risk_level,
        status=status,
        executed=False
    )
    db.add(query_rec)
    db.commit()
    db.refresh(query_rec)
    return query_rec

def get_query_history_by_project(db: Session, project_id: int) -> List[Query]:
    stmt = select(Query).where(Query.project_id == project_id).order_by(Query.created_at.desc())
    return list(db.scalars(stmt).all())

def get_query_by_id(db: Session, query_id: int) -> Optional[Query]:
    stmt = select(Query).where(Query.id == query_id)
    return db.scalar(stmt)

def update_query_execution_status(
    db: Session,
    query_id: int,
    status: str,
    execution_time_ms: float,
    rows_returned: int,
    result_summary: str
) -> Optional[Query]:
    query_rec = get_query_by_id(db, query_id)
    if query_rec:
        query_rec.executed = True
        query_rec.status = status
        query_rec.execution_time_ms = execution_time_ms
        query_rec.rows_returned = rows_returned
        query_rec.result_summary = result_summary
        db.commit()
        db.refresh(query_rec)
    return query_rec
