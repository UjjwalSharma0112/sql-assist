from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any

class ProjectCreate(BaseModel):
    name: str
    db_type: str = Field(..., description="postgres or mysql")
    host: str
    port: int
    database_name: str
    username: str
    password: str

class ProjectResponse(BaseModel):
    id: int
    name: str
    user_id: int
    db_type: str
    host: str
    port: int
    database_name: str
    db_username: str
    schema_data: Optional[Dict[str, Any]] = Field(default=None, alias="schema_json")
    schema_summary: Optional[str] = None
    relationship_summary: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
