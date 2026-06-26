from fastapi import APIRouter, Depends
from app.schemas.auth import SigninRequest, SignupRequest, LoginResponse, UserResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import signup as signup_user, signin as signin_user
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/signup", response_model=LoginResponse)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    return signup_user(data=data, db=db)

@router.post("/signin", response_model=LoginResponse)
def signin(data: SigninRequest, db: Session = Depends(get_db)):
    return signin_user(data=data, db=db)

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user