from fastapi import status, HTTPException, Depends, APIRouter
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import utils, models, schemas, oauth2
from ..database import get_db   

router = APIRouter(
    prefix='/auth',
    tags=['Authentication'],
)


@router.post('/login', response_model=schemas.Token)
def login(user_credentials: OAuth2PasswordRequestForm=Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Users).filter(models.Users.email == user_credentials.username).first()
    if not user or not utils.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid email or password")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified. Please verify your email before logging in.")
    access_token = oauth2.create_access_token(data={"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post('/verify')
def verify_user(user_verfiy: schemas.UserVerify, db: Session = Depends(get_db)):
    user_query = db.query(models.Users).filter(models.Users.id == user_verfiy.user_id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({user_verfiy.user_id}) was not found')
    elif user.is_verified:
        return {"message": "User is already verified."}
    elif user.verification_code == user_verfiy.code:
        user_query.update({"is_verified": True, "verification_code": None}, synchronize_session=False)
        db.commit()
        return {"message": "User verified successfully."}
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code.")
    
@router.post('/resend_code/{id}')
async def resend_verification_code(id: int, db: Session = Depends(get_db)):
    user_query = db.query(models.Users).filter(models.Users.id == id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({id}) was not found')
    elif user.is_verified:
        return {"message": "User is already verified."}
    else:
        code = utils.generate_verification_code()
        user_query.update({"verification_code": code}, synchronize_session=False)
        try:
            await utils.send_code_email(user.email, code)
            db.commit()
            return {"message": "Verification code resent! Check your email."}
        except Exception as e:
            print(e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email.") from e

