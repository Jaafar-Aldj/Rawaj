from fastapi import Response, status, HTTPException, Depends, APIRouter
from sqlalchemy.orm import Session
from .. import utils, models, schemas
from ..database import get_db

router = APIRouter(
    prefix='/users',
    tags=['User'],
)

@router.get('/{id}', response_model=schemas.UserResponse)
def get_user(id:int, db: Session = Depends(get_db)):
    user = db.query(models.Users).filter(models.Users.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f'user with id ({id}) was not found')
    return user


@router.post('/',response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(new_user: schemas.UserCreate, db: Session = Depends(get_db)):
    code = utils.generate_verification_code()
    user_dict = new_user.model_dump()
    user_dict['password_hash'] = utils.hash_function(user_dict.pop('password'))
    new_user_db = models.Users(**user_dict,verification_code=code)
    email_check = db.query(models.Users).filter(models.Users.email == new_user.email).first()
    username_check = db.query(models.Users).filter(models.Users.username == new_user.username).first()
    if email_check :
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email ({new_user.email}) already exists")
    elif username_check :
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username ({new_user.username}) already exists")
    db.add(new_user_db)
    try :
        await utils.send_code_email(new_user.email, code)
        db.commit()
        db.refresh(new_user_db)
        return new_user_db
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email.") from e

# @app.post('/', status_code=status.HTTP_201_CREATED)
# def create_user(new_user:schemas.UserCreate, db: Session = Depends(get_db)):
#     user_dict = new_user.model_dump()
#     # Hash the password before storing it (hashing function not implemented here)
#     # user_dict['password_hash'] = hash_function(user_dict.pop('password'))
#     user_dict.pop('password')  # Remove plain password
#     new_user_db = models.Users(**user_dict)
#     db.add(new_user_db)
#     db.commit()
#     db.refresh(new_user_db)
#     return new_user_db

@router.get('/', response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.Users).all()
    return users

@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int, db: Session = Depends(get_db)):
    user_query = db.query(models.Users).filter(models.Users.id == id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({id}) was not found')
    user_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.put('/{id}', response_model=schemas.UserResponse)
def update_user(id: int, updated_user: schemas.UserCreate, db: Session = Depends(get_db)):
    user_query = db.query(models.Users).filter(models.Users.id == id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({id}) was not found')
    user_data = updated_user.model_dump()
    # Hash the password before storing it (hashing function not implemented here)
    # user_data['password_hash'] = hash_function(user_data.pop('password'))
    user_data.pop('password')  # Remove plain password
    user_query.update(user_data, synchronize_session=False)
    db.commit()
    return user_query.first()

@router.post('/verify/{id}')
def verify_user(id: int, code: str, db: Session = Depends(get_db)):
    user_query = db.query(models.Users).filter(models.Users.id == id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({id}) was not found')
    elif user.is_verified:
        return {"message": "User is already verified."}
    elif user.verification_code == code:
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
