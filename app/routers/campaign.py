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
                product_analysis=campaign.product.image_analysis,
                image_ref=campaign.product.processed_image_url
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
                final_image_url = f"{req.base_url}assets/image/{filename}"
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
            db.commit() 
            db.refresh(new_asset)

            
            if new_asset.image_url:
                first_version = models.ImageVersions(
                    asset_id=new_asset.id,
                    image_url=new_asset.image_url,
                    prompt=new_asset.image_prompt,
                    version_number=1
                )
                db.add(first_version)
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
        "image_prompt": asset.image_prompt,
        "image_url": asset.campaign.product.processed_image_url, 
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
        image_path = updated_result.get("image_url")
        if image_path:
            filename = os.path.basename(image_path)
            new_url = f"{req.base_url}assets/image/{filename}"
            new_prompt = updated_result.get("image_prompt", asset.image_prompt)

            # 1. تحديث الأصل الرئيسي (ليراه المستخدم فوراً)
            asset.image_url = new_url
            asset.image_prompt = new_prompt
            
            # 2. حساب رقم الإصدار الجديد
            last_version = db.query(models.ImageVersions)\
                .filter(models.ImageVersions.asset_id == asset.id)\
                .order_by(models.ImageVersions.version_number.desc())\
                .first()
            
            next_ver = (last_version.version_number + 1) if last_version else 1
            
            # 3. حفظ الإصدار في الأرشيف
            new_version = models.ImageVersions(
                asset_id=asset.id,
                image_url=new_url,
                prompt=new_prompt,
                version_number=next_ver
            )
            db.add(new_version)

    # ... (حفظ التغييرات) ...
    db.commit()
    db.refresh(asset)
    return asset

# ==============================================================================
# المرحلة 3: الموافقة وتوليد الفيديو (Finalize)
# ==============================================================================

@router.put("/finalize", response_model=schemas.AssetResponse)
def finalize_asset(
    req: Request,
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
            video_path = manager.generate_veo_video(image_path=asset.image_url, prompt_text=asset.video_prompt)
            filename = os.path.basename(video_path)
            video_url = f"{req.base_url}assets/video/{filename}"
            asset.video_url = video_url
            
            first_vid_ver = models.VideoVersions(
                    asset_id=asset.id,
                    video_url=video_url,
                    prompt=asset.video_prompt,
                    version_number=1
                )
            db.add(first_vid_ver)
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



@router.put("/regenerate_video", response_model=schemas.AssetResponse)
def regenerate_video(
    request: schemas.RegenerateVideoRequest, 
    req: Request,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this asset")
    if not asset: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.campaign.product.user_id != current_user.id: 
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    current_data = {
        "video_prompt": asset.video_prompt,
        "image_url": asset.image_url, 
    }

    try:
        updated_video_data = manager.refine_video_with_feedback(
            current_data=current_data,
            feedback=request.feedback
        )
    except Exception as e:
        print(f"Edit Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to refine video prompt")
        
    video_path = updated_video_data.get("video_url")
    prompt_to_use = updated_video_data.get("video_prompt")
    if video_path:
        filename = os.path.basename(video_path)
        new_video_url = f"{req.base_url}assets/video/{filename}"
        
        # تحديث الأصل الرئيسي
        asset.video_url = new_video_url
        asset.video_prompt = prompt_to_use
        
        # --- حفظ إصدار جديد ---
        last_ver = db.query(models.VideoVersions)\
            .filter(models.VideoVersions.asset_id == asset.id)\
            .order_by(models.VideoVersions.version_number.desc())\
            .first()
        
        next_ver = (last_ver.version_number + 1) if last_ver else 1
        
        new_version = models.VideoVersions(
            asset_id=asset.id,
            video_url=new_video_url,
            prompt=prompt_to_use,
            version_number=next_ver
        )
        db.add(new_version)
        
        db.commit()
        db.refresh(asset)
        return asset
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Video generation returned None")



# ==============================================================================
# باقي العمليات: استرجاع الإصدار القديم، حذف الحملة/الأصل، جلب الحملة/الأصول
# ==============================================================================

    
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

@router.post("/asset/{asset_id}/restore_image/{version_id}", response_model=schemas.AssetResponse)
def restore_image_version(
        asset_id: int, 
        version_id: int, 
        db: Session = Depends(get_db), 
        current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
    ):
    campaign = db.query(models.Campaigns).join(models.Products).filter(models.CampaignAssets.id == asset_id).first()
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    asset = db.query(models.CampaignAssets).filter(models.CampaignAssets.id == asset_id).first()
    version = db.query(models.ImageVersions).filter(models.ImageVersions.id == version_id).first()
    
    if not asset or not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if version.asset_id != asset.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Version does not belong to this asset")
        
    # استرجاع البيانات من الإصدار القديم
    asset.image_url = version.image_url
    asset.image_prompt = version.prompt
    
    db.commit()
    return asset

@router.get("/asset/{asset_id}/versions/image", response_model=List[schemas.ImageVersionResponse])
def get_image_versions(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).join(models.Products).filter(models.CampaignAssets.id == asset_id).first()
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    asset = db.query(models.CampaignAssets).filter(models.CampaignAssets.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    
    
    versions = db.query(models.ImageVersions).filter(models.ImageVersions.asset_id == asset_id).order_by(models.ImageVersions.version_number.desc()).all()
    return versions

@router.get("/asset/{asset_id}/versions/video", response_model=List[schemas.VideoVersionResponse])
def get_video_versions(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).join(models.Products).filter(models.CampaignAssets.id == asset_id).first()
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    asset = db.query(models.CampaignAssets).filter(models.CampaignAssets.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    
    
    versions = db.query(models.VideoVersions).filter(models.VideoVersions.asset_id == asset_id).order_by(models.VideoVersions.version_number.desc()).all()
    return versions