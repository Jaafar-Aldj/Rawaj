from fastapi import APIRouter, Response, status, HTTPException, Depends, UploadFile, File, Request
from sqlalchemy.orm import Session
from app import oauth2
from .. import models, schemas, oauth2
from ..database import get_db

## Upload image dependencies
import shutil
import os
import uuid 

router = APIRouter(
    prefix='/products',
    tags=['Product'],
)

# تحديد مسار حفظ الصور
UPLOAD_DIR = "rawaj-frontend/assets"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-image")
async def upload_product_image(
        request: Request, 
        file: UploadFile = File(...),
        current_user:schemas.UserResponse=Depends(oauth2.get_current_user)):
    # 1. التحقق من نوع الملف (اختياري لكن مفضل)
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 2. توليد اسم فريد للملف (لتجنب تكرار الأسماء)
    # نأخذ الامتداد الأصلي (مثل .png)
    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 3. حفظ الملف على القرص
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save image: {str(e)}")

    # 4. إرجاع الرابط (URL) الذي سيستخدمه الفرونت إند
    # نفترض أن السيرفر يعمل على localhost:8000
    # ملاحظة: في الإنتاج، استبدل هذا برابط السيرفر الحقيقي
    image_url = f"{request.base_url}assets/{unique_filename}"
    
    return {"image_url": image_url}

@router.get('/', response_model=list[schemas.ProductResponse])
def get_products(
        db: Session = Depends(get_db), 
        current_user:schemas.UserResponse=Depends(oauth2.get_current_user),
        limit: int = 10,
        skip: int = 0,
    ):
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