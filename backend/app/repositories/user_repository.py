from sqlalchemy.orm import Session
from app.models.user import User
from sqlalchemy import select

def create_user(
    db: Session,
    email: str,
    hashed_password: str,
    username: str
):
  user = User(
    email=email,
    hashed_password=hashed_password,
    username=username
)
  db.add(user)
  db.commit()
  db.refresh(user)
  return user

def get_user_by_email(db: Session,email: str):
  stmt = select(User).where(User.email == email)
  user = db.scalar(stmt)
  return user