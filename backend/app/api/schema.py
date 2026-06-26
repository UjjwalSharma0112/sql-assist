from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.project_service import get_project_by_id
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any

router = APIRouter(
    prefix="/projects",
    tags=["Schema"]
)

class SchemaInfoResponse(BaseModel):
    schema_data: Optional[Dict[str, Any]] = Field(default=None, alias="schema_json")
    schema_summary: Optional[str] = None
    relationship_summary: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

@router.get("/{project_id}/schema", response_model=SchemaInfoResponse)
def get_project_schema(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_by_id(db, user_id=current_user.id, project_id=project_id)
    return {
        "schema_json": project.schema_json,
        "schema_summary": project.schema_summary,
        "relationship_summary": project.relationship_summary
    }
