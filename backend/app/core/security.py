
from jose import jwt, JWTError
from datetime  import datetime,timezone, timedelta
from app.core.config import SECRET_KEY, ALGORITHM

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


def hash_password(password: str):
  return password_hash.hash(password)

def verify_password(plain_password, hashed_password)-> bool:
  return password_hash.verify(
    plain_password,
    hashed_password
  )


def create_access_token(user_id: str):
  expire = datetime.now(timezone.utc) + timedelta(minutes=30)
  payload = {
    "sub" : user_id,
    "exp": expire
  }
  return jwt.encode(
    payload, SECRET_KEY, algorithm=ALGORITHM
  )


def decode_token(token: str):
  try: 
    payload = jwt.decode(
      token, SECRET_KEY, algorithms=[ALGORITHM]
    )
    return payload
  except JWTError:
    return None