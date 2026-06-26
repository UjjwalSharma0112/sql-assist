from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.project import ProjectCreate, ProjectResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.services import project_service
from typing import List

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return project_service.create_project(db=db, user_id=current_user.id, data=data)

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return project_service.get_projects(db=db, user_id=current_user.id)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return project_service.get_project_by_id(db=db, user_id=current_user.id, project_id=project_id)

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return project_service.delete_project(db=db, user_id=current_user.id, project_id=project_id)

@router.post("/{project_id}/sync", response_model=ProjectResponse)
def sync_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return project_service.sync_project_schema(db=db, user_id=current_user.id, project_id=project_id)

from pydantic import BaseModel

class TestConnectionRequest(BaseModel):
    db_type: str
    host: str
    port: int
    database_name: str
    username: str
    password: str

class TestConnectionResponse(BaseModel):
    success: bool
    tables: int
    columns: int
    relationships: int

@router.post("/test-connection", response_model=TestConnectionResponse)
def test_connection(data: TestConnectionRequest):
    from app.services.schema_service import extract_db_schema, test_db_connection
    is_connected = test_db_connection(
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        database=data.database_name,
        username=data.username,
        password=data.password
    )
    if not is_connected:
        return {
            "success": False,
            "tables": 0,
            "columns": 0,
            "relationships": 0
        }
    try:
        schema_json, _, _ = extract_db_schema(
            db_type=data.db_type,
            host=data.host,
            port=data.port,
            database=data.database_name,
            username=data.username,
            password=data.password
        )
        tables = schema_json.get("tables", [])
        tables_count = len(tables)
        columns_count = sum(len(t.get("columns", [])) for t in tables)
        relationships_count = sum(len(t.get("foreign_keys", [])) for t in tables)
        return {
            "success": True,
            "tables": tables_count,
            "columns": columns_count,
            "relationships": relationships_count
        }
    except Exception:
        return {
            "success": False,
            "tables": 0,
            "columns": 0,
            "relationships": 0
        }

