from fastapi import Response, status, HTTPException, Depends, APIRouter
from sqlalchemy.orm import Session

from app import oauth2
from .. import utils, models, schemas
from ..database import get_db

router = APIRouter(
    prefix='/users',
    tags=['User'],
)

@router.get('/me', response_model=schemas.UserResponse)
def get_current_user_data(current_user: schemas.UserResponse = Depends(oauth2.get_current_user)):
    return current_user


@router.post('/',response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(new_user: schemas.UserCreate, db: Session = Depends(get_db)):
    code = utils.generate_verification_code()
    user_dict = new_user.model_dump()
    user_dict['password_hash'] = utils.hash_function(user_dict.pop('password'))
    new_user_db = models.Users(**user_dict,verification_code=code)
    email_check = db.query(models.Users).filter(models.Users.email == new_user.email).first()
    if email_check :
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email ({new_user.email}) already exists")
    db.add(new_user_db)
    try :
        await utils.send_code_email(new_user.email, code)
        db.commit()
        db.refresh(new_user_db)
        return new_user_db
    except Exception as e:
        print(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email.") from e

@router.get('/', response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.Users).all()
    return users

@router.delete('/', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
        current_user: schemas.UserResponse = Depends(oauth2.get_current_user),
        db: Session = Depends(get_db)
    ):
    user_query = db.query(models.Users).filter(models.Users.id == current_user.id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({current_user.id}) was not found')
    user_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.put('/', response_model=schemas.UserResponse)
def update_user( 
        updated_user: schemas.UserUpdate,
        current_user: schemas.UserResponse = Depends(oauth2.get_current_user), 
        db: Session = Depends(get_db)
    ):
    user_query = db.query(models.Users).filter(models.Users.id == current_user.id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({current_user.id}) was not found')
    user_data = updated_user.model_dump()
    if 'password' in user_data and user_data['password'] is not None:
        user_data['password_hash'] = utils.hash_function(user_data.pop('password'))
    if 'name' in user_data and user_data['name'].strip() == "":
        user_data.pop('name')
    if 'password' in user_data and user_data['password'].strip() == "":
        user_data.pop('password')
    user_query.update(user_data, synchronize_session=False)
    db.commit()
    return user_query.first()