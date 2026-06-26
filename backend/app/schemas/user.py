from pydantic import BaseModel, EmailStr

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
