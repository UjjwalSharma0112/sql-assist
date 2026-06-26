from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class SigninRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    username: str
    access_token: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
