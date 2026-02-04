import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas, oauth2
from ..database import get_db
from ..agents import manager 
import asyncio
from concurrent.futures import ThreadPoolExecutor


router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"]
)

# ==============================================================================
# المرحلة 1: إنشاء الحملة وتحليل المنتج (Audience Suggestion)
# ==============================================================================
@router.post("/analyze", response_model=schemas.CampaignResponse, status_code=status.HTTP_201_CREATED)
def analyze_product(
    request: schemas.AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    product = db.query(models.Products).filter(models.Products.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with id {request.product_id} was not found")
    if product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this product")
    
    campaign_query = db.query(models.Campaigns).filter(models.Campaigns.product_id == request.product_id)
    campaign = campaign_query.first()
    if campaign and campaign.suggested_audiences:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign already exsist for this product")
    elif campaign :
        campaign_query.delete(synchronize_session=False)
        db.commit()

    # 2. استدعاء وكيل الذكاء الاصطناعي (المدير فقط) لاقتراح الفئات
    # (سنفترض وجود دالة suggest_audiences في manager.py)
    try:
        suggestions = manager.suggest_audiences(product.name, product.description, product.image_analysis)
    except Exception as e:
        print(f"AI Error: {e}")
        # في حال فشل الـ AI، نضع فئات افتراضية لكي لا يتوقف النظام
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to analyze product for audience suggestions")

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

@router.post("/generate_drafts",response_model=List[schemas.AssetResponse],status_code=status.HTTP_201_CREATED) 
async def generate_drafts(
    req: Request,
    request: schemas.DraftRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).filter(models.Campaigns.id == request.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    assets_query = db.query(models.CampaignAssets).filter(models.CampaignAssets.campaign_id == request.campaign_id)
    assets = assets_query.all()
    is_all_ok = True if assets else False
    for asset in assets:
        if asset.image_url is None:
            is_all_ok = False
            break
    if not is_all_ok and assets:
        for asset in assets:
            db.delete(asset)
            db.commit()
    if is_all_ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Assets already exsist for this campaign")

    def process_single_audience(audience):
        try:
            ai_result = manager.generate_content_for_audience(
                campaign.product.name, 
                campaign.product.description, 
                audience,
                product_analysis=campaign.product.image_analysis
            )
            image_url = ai_result.get("image_url")
            public_image_url = None
            if image_url:
                filename = os.path.basename(image_url)
                public_image_url = image_url
            return {
                "audience": audience,
                "data": ai_result,
                "local_image_path": public_image_url,
                "success": True
            }
        except Exception as e :
            print(f"❌ Error generating for {audience}: {e}")
            return {"audience": audience, "success": False, "error": str(e)}

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        tasks =[]   
        for audience in request.selected_audiences:
            tasks.append(loop.run_in_executor(pool, process_single_audience, audience))
        results = await asyncio.gather(*tasks)

    generated_assets = []
    
    for result in results:
        if result["success"] :
            ai_data = result["data"]
            final_image_url = None
            if result["local_image_path"]:
                filename = os.path.basename(result["local_image_path"])
                final_image_url = f"{req.base_url}assets/{filename}"
            new_asset = models.CampaignAssets(
                campaign_id=campaign.id,
                target_audience=result["audience"],
                ad_copy=ai_data.get("ad_copy"),
                image_prompt=ai_data.get("image_prompt"),
                image_url=final_image_url,
                video_prompt=ai_data.get("video_prompt"),
                is_approved=False
            )
            db.add(new_asset)
            generated_assets.append(new_asset)
        else:
            print(f"Skipping failed audience: {result['audience']}")

    if generated_assets:
        campaign.status = "PENDING_APPROVAL"
        db.commit()
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate any drafts")
    
    return generated_assets


# ==============================================================================
# المرحلة 2.5: تعديل المسودة (Draft Editing)
# ==============================================================================

@router.put("/edit_draft", response_model=schemas.AssetResponse)
def edit_draft_content(
    request_data: schemas.DraftEditRequest,
    req: Request, # للحصول على base_url
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الأصل (Asset)
    asset = db.query(models.CampaignAssets).filter(models.CampaignAssets.id == request_data.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft asset not found")
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this asset")
   
    # 2. استدعاء وكيل التعديل
    # نجهز البيانات الحالية لنرسلها للذكاء
    current_data = {
        "ad_copy": asset.ad_copy,
        "image_prompt": asset.image_prompt
    }
    
    try:
        updated_result = manager.refine_draft(
            current_data=current_data,
            feedback=request_data.feedback,
            edit_type=request_data.edit_type
        )
    except Exception as e:
        print(f"Edit Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to refine draft")
    
    # 3. تحديث الداتا بيز بالقيم الجديدة
    if request_data.edit_type in ["text", "both"] and updated_result.get("ad_copy"):
        asset.ad_copy = updated_result["ad_copy"]
        print("Updating ad copy")
        
    if request_data.edit_type in ["image", "both"]:
        # تحديث الصورة إذا وجدت
        image_path = updated_result.get("image_url")
        if image_path:
            filename = os.path.basename(image_path)
            asset.image_url = f"{req.base_url}assets/{filename}"
            print("Updating image URL")
            
        # تحديث البرومبت
        if updated_result.get("image_prompt"):
            asset.image_prompt = updated_result["image_prompt"]

    db.commit()
    db.refresh(asset)
    return asset

# ==============================================================================
# المرحلة 3: الموافقة وتوليد الفيديو (Finalize)
# ==============================================================================

@router.put("/finalize", response_model=schemas.AssetResponse)
def finalize_asset(
    request: schemas.ApproveRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الأصل والتأكد من الملكية (عبر JOIN مع الحملة)
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this asset")
    if asset.is_approved :
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset already approved")

    # 2. توليد الفيديو (إذا كان هناك وصف)
    if asset.video_prompt:
        try:
            video_url = manager.generate_veo_video(image_path=asset.image_url, prompt_text=asset.video_prompt)
            asset.video_url = video_url
        except Exception as e:
            print(f"Video Error: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate video")

    # 3. تحديث الحالة
    asset.is_approved = True
    db.commit()

    # 3. (إضافة ذكية) التحقق هل اكتملت الحملة؟
    # نعد كم أصل في الحملة، وكم واحد منهم Approved
    total_assets = db.query(models.CampaignAssets).filter(
        models.CampaignAssets.campaign_id == asset.campaign_id
    ).count()
    approved_assets = db.query(models.CampaignAssets).filter(
        models.CampaignAssets.campaign_id == asset.campaign_id,
        models.CampaignAssets.is_approved == True
    ).count()
    

    if total_assets == approved_assets:
        asset.campaign.status = "COMPLETED"
        db.commit()
    return asset
    
@router.get("/{campaign_id}", response_model=schemas.CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).options(joinedload(models.Campaigns.assets))\
        .filter(models.Campaigns.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    return campaign

@router.get("/", response_model=List[schemas.CampaignResponse])
def get_user_campaigns(
    status: Optional[str] = None,    
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaigns_query = db.query(models.Campaigns)\
        .options(joinedload(models.Campaigns.assets))\
        .join(models.Products)\
        .filter(models.Products.user_id == current_user.id)
    if status:
        campaigns = campaigns_query.filter(models.Campaigns.status == status.upper()).all()
    else:
        campaigns = campaigns_query.all()
    return campaigns

@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).filter(models.Campaigns.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    
    db.delete(campaign)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/asset/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).filter(models.CampaignAssets.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this asset")
    
    db.delete(asset)
    db.commit()
    # تحقق إذا ما كانت الحملة مكتملة بعد حذف الأصل
    total_assets = db.query(models.CampaignAssets).filter(
        models.CampaignAssets.campaign_id == asset.campaign_id
    ).count()
    approved_assets = db.query(models.CampaignAssets).filter(
        models.CampaignAssets.campaign_id == asset.campaign_id,
        models.CampaignAssets.is_approved == True
    ).count()
    
    if total_assets == approved_assets:
        asset.campaign.status = "COMPLETED"
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/asset/{asset_id}", response_model=schemas.AssetResponse)
def get_campaign_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).filter(models.CampaignAssets.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this asset")
    
    return asset

