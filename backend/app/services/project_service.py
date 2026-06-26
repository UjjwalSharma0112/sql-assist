from sqlalchemy.orm import Session
from app.models.project import Project
from app.schemas.project import ProjectCreate
from app.core.encryption import encrypt_password
from app.services.schema_service import test_db_connection, extract_db_schema
from fastapi import HTTPException, status
from sqlalchemy import select
from datetime import datetime

def create_project(db: Session, user_id: int, data: ProjectCreate) -> Project:
    is_connected = test_db_connection(
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        database=data.database_name,
        username=data.username,
        password=data.password
    )
    if not is_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not establish connection to the database. Please check credentials and try again."
        )

    schema_json, schema_summary, relationship_summary = extract_db_schema(
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        database=data.database_name,
        username=data.username,
        password=data.password
    )

    encrypted_pwd = encrypt_password(data.password)

    project = Project(
        name=data.name,
        user_id=user_id,
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        database_name=data.database_name,
        db_username=data.username,
        encrypted_db_password=encrypted_pwd,
        schema_json=schema_json,
        schema_summary=schema_summary,
        relationship_summary=relationship_summary,
        last_synced_at=datetime.utcnow()
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def get_projects(db: Session, user_id: int):
    stmt = select(Project).where(Project.user_id == user_id)
    return db.scalars(stmt).all()

def get_project_by_id(db: Session, user_id: int, project_id: int) -> Project:
    stmt = select(Project).where(Project.user_id == user_id, Project.id == project_id)
    project = db.scalar(stmt)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

def delete_project(db: Session, user_id: int, project_id: int):
    project = get_project_by_id(db, user_id, project_id)
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

def sync_project_schema(db: Session, user_id: int, project_id: int) -> Project:
    project = get_project_by_id(db, user_id, project_id)
    
    from app.core.encryption import decrypt_password
    decrypted_pwd = decrypt_password(project.encrypted_db_password)

    is_connected = test_db_connection(
        db_type=project.db_type,
        host=project.host,
        port=project.port,
        database=project.database_name,
        username=project.db_username,
        password=decrypted_pwd
    )
    if not is_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sync failed. Could not establish connection to the database."
        )

    schema_json, schema_summary, relationship_summary = extract_db_schema(
        db_type=project.db_type,
        host=project.host,
        port=project.port,
        database=project.database_name,
        username=project.db_username,
        password=decrypted_pwd
    )

    project.schema_json = schema_json
    project.schema_summary = schema_summary
    project.relationship_summary = relationship_summary
    project.last_synced_at = datetime.utcnow()
    project.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(project)
    return project
