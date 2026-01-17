from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from .. import models, schemas, oauth2
from ..database import get_db
from ..agents import manager 

router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"]
)

# ==============================================================================
# المرحلة 1: إنشاء الحملة وتحليل المنتج (Audience Suggestion)
# ==============================================================================
@router.post("/analyze/{product_id}", response_model=schemas.CampaignResponse)
def analyze_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    product = db.query(models.Products).filter(models.Products.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with id {product_id} was not found")
    if product.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this product")

    # 2. استدعاء وكيل الذكاء الاصطناعي (المدير فقط) لاقتراح الفئات
    # (سنفترض وجود دالة suggest_audiences في manager.py)
    try:
        suggestions = manager.suggest_audiences(product.name, product.description)
    except Exception as e:
        print(f"AI Error: {e}")
        # في حال فشل الـ AI، نضع فئات افتراضية لكي لا يتوقف النظام
        raise HTTPException(status_code=500, detail="Failed to analyze product for audience suggestions")

    # 3. إنشاء الحملة في قاعدة البيانات (Status: DRAFT)
    new_campaign = models.Campaigns(
        product_id=product.id,
        status="DRAFT",
        suggested_audiences=suggestions # يحفظ كـ JSON تلقائياً
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    
    return new_campaign


# ==============================================================================
# المرحلة 2: اختيار الفئات وتوليد المسودات (Draft Generation)
# ==============================================================================

@router.post("/generate_drafts",response_model=List[schemas.AssetResponse]) # لا نضع response_model هنا لأننا سنرجع قائمة معقدة
def generate_drafts(
    request: schemas.DraftRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الحملة
    campaign = db.query(models.Campaigns).filter(models.Campaigns.id == request.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this campaign")

    # 2. التكرار على كل فئة وتوليد المحتوى
    generated_assets = []
    
    for audience in request.selected_audiences:
        # استدعاء الـ AI لتوليد محتوى لهذه الفئة
        # (سنفترض وجود دالة generate_content_for_audience في manager.py)
        ai_result = manager.generate_content_for_audience(
            campaign.product.name, 
            campaign.product.description, 
            audience
        )
        
        # حفظ الأصل (Asset) في قاعدة البيانات
        new_asset = models.CampaignAssets(
            campaign_id=campaign.id,
            target_audience=audience,
            ad_copy=ai_result.get("ad_copy"),       # JSON
            image_prompt=ai_result.get("image_prompt"),
            image_url=ai_result.get("image_url"),   # رابط الصورة المولدة
            video_prompt=ai_result.get("video_prompt"),
            is_approved=False
        )
        db.add(new_asset)
        generated_assets.append(new_asset)

    # تحديث حالة الحملة
    campaign.status = "PENDING_APPROVAL"
    db.commit()
    
    return generated_assets


# ==============================================================================
# المرحلة 3: الموافقة وتوليد الفيديو (Finalize)
# ==============================================================================

@router.post("/finalize", )
def finalize_asset(
    request: schemas.ApproveRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الأصل والتأكد من الملكية (عبر JOIN مع الحملة)
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this asset")

    # 2. توليد الفيديو (إذا كان هناك وصف)
    if asset.video_prompt:
        try:
            # video_url = manager.generate_video(asset.video_prompt)
            video_url = "http://fake-video-url.com/video.mp4" # مؤقتاً
            asset.video_url = video_url
        except Exception as e:
            print(f"Video Error: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate video")

    # 3. تحديث الحالة
    asset.is_approved = True
    asset.campaign.status = "COMPLETED"
    db.commit()
    return 