from fastapi import APIRouter, Response, status, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix='/products',
    tags=['Product'],
)

@router.get('/')
def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Products).all()
    return products

@router.get('/{id}')
def get_product(id: int, db: Session = Depends(get_db)):
    product = db.query(models.Products).filter(models.Products.id == id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'product with id ({id}) was not found')
    return product

@router.post('/', status_code=status.HTTP_201_CREATED)
def create_product(new_product: schemas.ProductCreate, db: Session = Depends(get_db)):
    product_dict = new_product.model_dump()
    new_product_db = models.Products(**product_dict)
    db.add(new_product_db)
    db.commit()
    db.refresh(new_product_db)
    return new_product_db

@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_product(id: int, db: Session = Depends(get_db)):
    product_query = db.query(models.Products).filter(models.Products.id == id)
    product = product_query.first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'product with id ({id}) was not found')
    product_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
