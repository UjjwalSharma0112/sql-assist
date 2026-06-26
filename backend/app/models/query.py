from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Query(Base):
    __tablename__ = "queries"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    question: Mapped[str] = mapped_column(Text)
    generated_sql: Mapped[str] = mapped_column(Text)
    query_explanation: Mapped[str] = mapped_column(Text)
    affected_tables: Mapped[str] = mapped_column(Text)  # Comma-separated or JSON list of tables
    estimated_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_level: Mapped[str] = mapped_column(String)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String)  # success, error, pending
    executed: Mapped[bool] = mapped_column(Boolean, default=False)
    execution_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    rows_returned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="queries")
