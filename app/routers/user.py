from fastapi import BackgroundTasks, Request, Response, status, HTTPException, Depends, APIRouter
from sqlalchemy.orm import Session

from app import oauth2
from app.limiter import limiter
from .. import utils, models, schemas
from ..database import get_db

router = APIRouter(
    prefix='/users',
    tags=['User'],
)
from app.logger import get_logger
logger = get_logger(__name__)

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
        logger.warning(f"Attempted to create user with existing email: {new_user.email}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email ({new_user.email}) already exists")
    db.add(new_user_db)
    try :
        await utils.send_code_email(new_user.email, code)
        db.commit()
        db.refresh(new_user_db)
        return new_user_db
    except Exception as e:
        logger.error(f"Failed to send verification email to {new_user.email}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email.") from e


@router.delete('/', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
        current_user: schemas.UserResponse = Depends(oauth2.get_current_user),
        db: Session = Depends(get_db)
    ):
    user_query = db.query(models.Users).filter(models.Users.id == current_user.id)
    user = user_query.first()
    if not user:
        logger.warning(f"Attempted to delete non-existent user: {current_user.id}")
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
        logger.warning(f"Attempted to update non-existent user: {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'user with id ({current_user.id}) was not found')
    user_data = updated_user.model_dump()
    if 'name' in user_data and user_data['name'].strip() == "":
        user_data.pop('name')

    if len(user_data) == 0:
        logger.info(f"No valid fields provided for update for user: {current_user.id}")
        return user  
    user_query.update(user_data, synchronize_session=False)
    db.commit()
    return user_query.first()

@router.post('/contact', status_code=status.HTTP_200_OK)
@limiter.limit("1/minute")
async def submit_contact_form(
    request: Request,
    contact_data: schemas.ContactMessageCreate,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(
        utils.send_contact_alert_email,
        name=contact_data.name,
        sender_email=contact_data.email,
        user_message=contact_data.message
    )

    return {"message": "تم إرسال رسالتك بنجاح. سنتواصل معك قريباً!"}