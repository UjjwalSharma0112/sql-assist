from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import DATABASE_URL

# Only pass check_same_thread for SQLite databases
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
  bind=engine,
  autoflush=False,
  autocommit = False
)
def get_db():
  db = SessionLocal()
  try: 
    yield db
  finally:
    db.close()
class Base(DeclarativeBase):
  pass