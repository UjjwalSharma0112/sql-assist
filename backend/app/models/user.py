from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class User(Base):
  __tablename__ = "users"

  id: Mapped[int] = mapped_column(primary_key=True)
  email : Mapped[str] = mapped_column(
    String, 
    unique=True,
    index =True
  )
  hashed_password: Mapped[str]
  username: Mapped[str]
  created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

  # Relationships
  projects: Mapped[list["Project"]] = relationship(back_populates="user", cascade="all, delete-orphan")