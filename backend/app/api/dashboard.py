from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.query import Query
from pydantic import BaseModel

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

class DashboardStatsResponse(BaseModel):
    total_projects: int
    total_queries: int
    queries_executed: int
    databases_connected: int

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total projects count
    projects_stmt = select(func.count(Project.id)).where(Project.user_id == current_user.id)
    total_projects = db.scalar(projects_stmt) or 0
    
    # Total queries count
    queries_stmt = (
        select(func.count(Query.id))
        .join(Project, Query.project_id == Project.id)
        .where(Project.user_id == current_user.id)
    )
    total_queries = db.scalar(queries_stmt) or 0
    
    # Queries executed count
    executed_stmt = (
        select(func.count(Query.id))
        .join(Project, Query.project_id == Project.id)
        .where(Project.user_id == current_user.id, Query.executed == True)
    )
    queries_executed = db.scalar(executed_stmt) or 0
    
    return {
        "total_projects": total_projects,
        "total_queries": total_queries,
        "queries_executed": queries_executed,
        "databases_connected": total_projects
    }
