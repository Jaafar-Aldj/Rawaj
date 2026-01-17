from fastapi import APIRouter, Response, status, HTTPException, Depends
from sqlalchemy.orm import Session

from app import oauth2
from .. import models, schemas, oauth2
from ..database import get_db

router = APIRouter(
    prefix='/products',
    tags=['Product'],
)

@router.get('/', response_model=list[schemas.ProductResponse])
def get_products(
        db: Session = Depends(get_db), 
        current_user:schemas.UserResponse=Depends(oauth2.get_current_user),
        limit: int = 10,
        skip: int = 0,
    ):
    print(current_user.is_verified)
    products = db.query(models.Products).filter(models.Products.user_id == current_user.id).limit(limit).offset(skip).all()
    return products

@router.get('/{id}',response_model=schemas.ProductResponse)
def get_product(id: int, db: Session = Depends(get_db), current_user:schemas.UserResponse=Depends(oauth2.get_current_user)):
    product = db.query(models.Products).filter(models.Products.id == id , models.Products.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'product with id ({id}) was not found')
    return product

@router.post('/', status_code=status.HTTP_201_CREATED, response_model=schemas.ProductResponse)
def create_product(
        new_product: schemas.ProductCreate, 
        db: Session = Depends(get_db), 
        current_user:schemas.UserResponse=Depends(oauth2.get_current_user)
    ):
    product_dict = new_product.model_dump()
    new_product_db = models.Products(user_id = current_user.id, **product_dict)
    db.add(new_product_db)
    db.commit()
    db.refresh(new_product_db)
    return new_product_db

@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_product(id: int, db: Session = Depends(get_db), current_user:schemas.UserResponse=Depends(oauth2.get_current_user)):
    product_query = db.query(models.Products).filter(models.Products.id == id)
    product = product_query.first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'product with id ({id}) was not found')
    if product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform requested action")
    product_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put('/{id}', response_model=schemas.ProductResponse)
def update_product(
        id: int, 
        updated_product: schemas.ProductCreate, 
        db: Session = Depends(get_db), 
        current_user:schemas.UserResponse=Depends(oauth2.get_current_user)
    ):
    product_query = db.query(models.Products).filter(models.Products.id == id)
    product = product_query.first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'product with id ({id}) was not found')
    if product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform requested action")
    product_query.update(updated_product.model_dump(), synchronize_session=False)
    db.commit()
    return product_query.first()