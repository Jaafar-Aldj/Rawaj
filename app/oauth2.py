import jwt
from jwt.exceptions import PyJWTError
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from . import schemas, database, models
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, status, HTTPException
from .config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Secret key to encode and decode JWT tokens
# Algorithm used for encoding and decoding
# Token expiration time in minutes


SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str, crendentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id:int = int(payload.get("user_id"))
        if id is None:
            raise crendentials_exception
        token_data = schemas.TokenData(id=id)
    except PyJWTError:
        raise crendentials_exception
    return token_data

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    crendentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Could not validate credentials", 
        headers={"WWW-Authenticate": "Bearer"}
    )
    token_data = verify_access_token(token, crendentials_exception)
    user = db.query(models.Users).filter(models.Users.id == token_data.id).first()
    return user