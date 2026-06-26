from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    db_type: Mapped[str] = mapped_column(String)  # postgres, mysql
    host: Mapped[str] = mapped_column(String)
    port: Mapped[int] = mapped_column(Integer)
    database_name: Mapped[str] = mapped_column(String)
    db_username: Mapped[str] = mapped_column(String)
    encrypted_db_password: Mapped[str] = mapped_column(String)
    
    schema_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    schema_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    relationship_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="projects")
    queries: Mapped[list["Query"]] = relationship(back_populates="project", cascade="all, delete-orphan")
