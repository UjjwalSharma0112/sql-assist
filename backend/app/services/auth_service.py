from app.schemas.auth import SignupRequest, SigninRequest
from app.repositories.user_repository import get_user_by_email, create_user
from sqlalchemy.orm import Session
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException

def signup(data: SignupRequest, db: Session):
    if get_user_by_email(db=db, email=data.email):
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )
    password = hash_password(data.password)
    user = create_user(db=db, email=data.email, username=data.username, hashed_password=password)

    token = create_access_token(str(user.id))
    return {"username": user.username, "access_token": token}

def signin(data: SigninRequest, db: Session):
    user = get_user_by_email(db=db, email=data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    token = create_access_token(str(user.id))
    return {"username": user.username, "access_token": token}