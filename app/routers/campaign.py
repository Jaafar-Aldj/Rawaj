import asyncio
import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from sqlalchemy.orm.attributes import flag_modified
from sse_starlette.sse import EventSourceResponse
from starlette.concurrency import run_in_threadpool

from app.notifications import  get_queue, send_notification, close_connection, active_connections
from app.services.audio_gen import AVAILABLE_VOICES
from .. import models, schemas, oauth2
from ..database import get_db
from ..agents import manager 
from ..cleanup import cleanup_orphaned_files




router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"]
)

# ==============================================================================
# المرحلة 1A: الدردشة الاستراتيجية (Interactive Strategy Chat)
# ==============================================================================
@router.post("/analyze/chat", response_model=schemas.CampaignResponse, status_code=status.HTTP_200_OK)
def chat_with_strategist(
    request: schemas.CampaignChatRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. التحقق من المنتج
    product = db.query(models.Products).filter(models.Products.id == request.product_id).first()
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Product not found or unauthorized")

    campaign = None
    chat_history = []

    # 2. إدارة جلسة الحملة (Session Management)
    if request.campaign_id:
        # هذه رسالة متابعة (Follow-up) لحملة موجودة مسبقاً
        campaign = db.query(models.Campaigns).filter(models.Campaigns.id == request.campaign_id).first()
        if not campaign or campaign.product_id != product.id:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # التأكد من أن الحملة لم تعتمد بعد
        if campaign.is_strategy_approved:
            raise HTTPException(status_code=400, detail="Strategy already approved. Cannot chat further.")
            
        chat_history = campaign.chat_history if campaign.chat_history else []
    else:
        # هذه أول رسالة (New Chat)، ننشئ حملة جديدة في الداتا بيز
        campaign = models.Campaigns(
            product_id=product.id,
            status="DRAFTING_STRATEGY",
            chat_history=[],
            is_strategy_approved=False
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)

    # 3. تسجيل رسالة المستخدم في التاريخ (History)
    user_msg = {"role": "user", "content": request.message}
    chat_history.append(user_msg)

    # 4. استدعاء الذكاء الاصطناعي (المدير الإبداعي كـ "مستشار")
    try:
        # نمرر التاريخ السابق ليفهم السياق
        ai_reply_text = manager.chat_with_director(
            product.name, 
            product.description, 
            product.image_analysis, 
            request.message,
            chat_history[:-1] # نرسل التاريخ القديم بدون الرسالة الحالية (لأننا نرسلها كـ message)
        )
    except Exception as e:
        print(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get a response from the strategist.")

    # 5. تسجيل رد الذكاء الاصطناعي في التاريخ
    ai_msg = {"role": "assistant", "content": ai_reply_text}
    chat_history.append(ai_msg)

    # 6. تحديث قاعدة البيانات وحفظ المحادثة
    # ملاحظة مهمة في SQLAlchemy: لتحديث عمود JSONB، يجب إسناد قائمة جديدة بالكامل
    campaign.chat_history = list(chat_history) 
    flag_modified(campaign, "chat_history")
    db.commit()
    db.refresh(campaign)
    
    return campaign

# ==============================================================================
# المرحلة 1B: اعتماد الاستراتيجية وتوليد الـ JSON (Approve Strategy)
# ==============================================================================

@router.post("/analyze/approve", response_model=schemas.CampaignResponse, status_code=status.HTTP_200_OK)
def approve_strategy(
    request: schemas.ApproveStrategyRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الحملة
    campaign = db.query(models.Campaigns).join(models.Products).filter(
        models.Campaigns.id == request.campaign_id,
        models.Products.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign.is_strategy_approved:
         raise HTTPException(status_code=400, detail="Strategy already approved.")

    # 2. استدعاء الذكاء لإخراج الـ JSON بناءً على المحادثة السابقة
    try:
        final_json_strategy = manager.finalize_strategy(campaign.product.name, campaign.chat_history)
    except Exception as e:
        print(f"AI Finalize Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to finalize the strategy JSON.")

    # 3. حفظ الـ JSON في قاعدة البيانات (كما فعلنا في الكود القديم)
    campaign.name = final_json_strategy.get("name", "حملة مخصصة")
    campaign.objective = final_json_strategy.get("objective", "هدف مخصص")
    campaign.suggested_audiences = final_json_strategy.get("suggested_audiences")
    campaign.posting_strategy = final_json_strategy.get("posting_strategy")
    campaign.trending_events = final_json_strategy.get("trending_events", [])
    
    # تغيير الحالة لتسمح بالانتقال للمرحلة التالية (توليد النصوص)
    campaign.is_strategy_approved = True
    campaign.status = "STRATEGY_APPROVED"
    
    db.commit()
    db.refresh(campaign)
    
    return campaign

# ==============================================================================
# المرحلة 2: اختيار الفئات وتوليد المسودات (Draft Generation)
# ==============================================================================

@router.post("/generate_copies", response_model=List[schemas.AssetResponse], status_code=status.HTTP_201_CREATED) 
async def generate_copies(
    request: schemas.DraftCopyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).filter(models.Campaigns.id == request.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.query(models.CampaignAssets).filter(models.CampaignAssets.campaign_id == request.campaign_id).delete()
    db.commit()
    

    platforms = request.selected_platforms if request.selected_platforms else []
    generated_assets = []
    
    process_id = f"copies_{campaign.id}"
    await send_notification(process_id, "🚀 بدأ الفريق بكتابة النصوص الإعلانية...")
    
    for audience in request.selected_audiences:
        try:
            await send_notification(process_id, f"✍️ جاري كتابة إعلان مخصص لفئة: {audience}...")

            ai_result = await run_in_threadpool( 
                manager.generate_copy_only,
                product_name=campaign.product.name, 
                product_desc=campaign.product.description, 
                audience=audience,
                platforms=platforms
            )
            
            new_asset = models.CampaignAssets(
                campaign_id=campaign.id,
                target_audience=audience,
                ad_copy=ai_result.get("ad_copy"),
                is_approved=False
            )
            db.add(new_asset)
            generated_assets.append(new_asset)

            await send_notification(process_id, f"✅ اكتملت نصوص فئة: {audience}.")
        except Exception as e:
            print(f"❌ Error generating copy for {audience}: {e}")

    if generated_assets:
        campaign.status = "DRAFTS_READY"
        db.commit()
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate copies")
    
    for asset in generated_assets: db.refresh(asset)

    await send_notification(process_id, "🎉 اكتملت مرحلة النصوص بنجاح!")
    background_tasks.add_task(close_connection, process_id)

    return generated_assets

# ==============================================================================
# المرحلة 3A: توليد صورة حسب الطلب (On-Demand Image)
# ==============================================================================
@router.post("/generate_image", response_model=schemas.ImageAssetResponse, status_code=status.HTTP_201_CREATED)
async def generate_image_asset(
    request: schemas.GenerateImageRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # جلب الأصل (الفئة المستهدفة)
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset or asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found or unauthorized")
    process_id = f"image_{request.asset_id}"
    await send_notification(process_id, f"🎨 جاري رسم وتوليد الصورة لمنصة {request.platform}...")

    main_loop = asyncio.get_running_loop()
    def sync_notify(message: str):
        """
        هذه الدالة عادية (Sync)، يمكن استدعاؤها من أي مكان (حتى داخل Thread).
        وظيفتها إرسال الإشعار للـ Event Loop الرئيسي بأمان.
        """
        if main_loop.is_running():
            asyncio.run_coroutine_threadsafe(send_notification(process_id, message), main_loop)

    try:
        # استدعاء المانجر لتوليد الصورة
        ai_result = await run_in_threadpool(
            manager.generate_image_on_demand,
            product_name=asset.campaign.product.name,
            audience=asset.target_audience,
            ad_copy_json=asset.ad_copy,
            aspect_ratio=request.aspect_ratio,
            original_image_path=asset.campaign.product.processed_image_url,
            notify_callback = sync_notify,
            event_name = request.event_name
        )
        
        image_path = ai_result.get("image_url")
        if not image_path:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Image generation failed")
             
        filename = os.path.basename(image_path)
        public_image_url = f"{req.base_url}assets/image/{filename}"
        
        # حفظ الصورة في جدول image_assets الجديد
        new_image = models.ImageAssets(
            asset_id=asset.id,
            image_url=public_image_url,
            prompt=ai_result.get("image_prompt"),
            aspect_ratio=request.aspect_ratio,
            platform=request.platform,
            event_name=request.event_name,
            event_angle=request.event_angle
        )
        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        
        await send_notification(process_id, "✅ تم إنشاء الصورة بنجاح!")
        background_tasks.add_task(close_connection, process_id)

        return new_image

    except Exception as e:
        print(f"Image Error: {e}")
        await send_notification(process_id, f"❌ فشل التوليد: {e}")
        background_tasks.add_task(close_connection, process_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ==============================================================================
# المرحلة 3B: توليد فيديو حسب الطلب (On-Demand Video)
# ==============================================================================
@router.post("/generate_video", response_model=schemas.VideoAssetResponse, status_code=status.HTTP_201_CREATED)
async def generate_video_asset(
    request: schemas.GenerateVideoRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset or asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Asset not found or unauthorized")

    process_id = f"video_{asset.id}"
    await send_notification(process_id, "🎬 جاري كتابة السيناريو السينمائي (Storyboard)...")

    main_loop = asyncio.get_running_loop()
    def sync_notify(message: str):
        """
        هذه الدالة عادية (Sync)، يمكن استدعاؤها من أي مكان (حتى داخل Thread).
        وظيفتها إرسال الإشعار للـ Event Loop الرئيسي بأمان.
        """
        if main_loop.is_running():
            asyncio.run_coroutine_threadsafe(send_notification(process_id, message), main_loop)

    try:
        ai_result = await run_in_threadpool(
            manager.generate_video_on_demand,
            product_name=asset.campaign.product.name,
            audience=asset.target_audience,
            ad_copy_json=asset.ad_copy,
            duration=request.video_duration,
            aspect_ratio=request.aspect_ratio,
            base_image_path=asset.campaign.product.processed_image_url,
            notify_callback=sync_notify,
            event_name= request.event_name,
            event_angle= request.event_angle,
            voice_preference= request.voice_preference if request.voice_preference in AVAILABLE_VOICES else "Auto"
        )
        
        video_path = ai_result.get("video_url")
        if not video_path:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Video generation failed")
             
        filename = os.path.basename(video_path)
        public_video_url = f"{req.base_url}assets/video/{filename}"
        
        # حفظ الفيديو في جدول video_assets الجديد
        new_video = models.VideoAssets(
            asset_id=asset.id,
            video_url=public_video_url,
            video_storyboard=ai_result.get("video_storyboard"),
            duration_seconds=request.video_duration,
            aspect_ratio=request.aspect_ratio,
            event_name=request.event_name,
            event_angle=request.event_angle
        )
        db.add(new_video)
        db.commit()
        db.refresh(new_video)
        
        await send_notification(process_id, "✅ تم حفظ الفيديو في النظام.")
        background_tasks.add_task(close_connection, process_id)

        return new_video

    except Exception as e:
        print(f"Video Error: {e}")
        await send_notification(process_id, f"❌ فشل العملية: {str(e)}")
        background_tasks.add_task(close_connection, process_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/generate_extended_video", response_model=schemas.VideoAssetResponse, status_code=status.HTTP_201_CREATED)
async def generate_extended_video_asset(
    request: schemas.GenerateVideoRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset or asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Asset not found or unauthorized")

    process_id = f"video_{asset.id}"
    await send_notification(process_id, "🎬 جاري كتابة السيناريو السينمائي (Storyboard)...")

    main_loop = asyncio.get_running_loop()
    def sync_notify(message: str):
        """
        هذه الدالة عادية (Sync)، يمكن استدعاؤها من أي مكان (حتى داخل Thread).
        وظيفتها إرسال الإشعار للـ Event Loop الرئيسي بأمان.
        """
        if main_loop.is_running():
            asyncio.run_coroutine_threadsafe(send_notification(process_id, message), main_loop)

    try:
        ai_result = await run_in_threadpool(
            manager.generate_extended_video,
            product_name=asset.campaign.product.name,
            audience=asset.target_audience,
            ad_copy_json=asset.ad_copy,
            duration=request.video_duration,
            aspect_ratio=request.aspect_ratio,
            base_image_path=asset.campaign.product.processed_image_url,
            notify_callback=sync_notify,
            event_name= request.event_name,
            event_angle= request.event_angle,
            voice_preference= request.voice_preference if request.voice_preference in AVAILABLE_VOICES else "Auto"
        )
        
        video_path = ai_result.get("video_url")
        if not video_path:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Video generation failed")
             
        filename = os.path.basename(video_path)
        public_video_url = f"{req.base_url}assets/video/{filename}"
        
        # حفظ الفيديو في جدول video_assets الجديد
        new_video = models.VideoAssets(
            asset_id=asset.id,
            video_url=public_video_url,
            video_storyboard=ai_result.get("video_storyboard"),
            duration_seconds=request.video_duration,
            aspect_ratio=request.aspect_ratio,
            event_name=request.event_name,
            event_angle=request.event_angle
        )
        db.add(new_video)
        db.commit()
        db.refresh(new_video)
        
        await send_notification(process_id, "✅ تم حفظ الفيديو في النظام.")
        background_tasks.add_task(close_connection, process_id)

        return new_video

    except Exception as e:
        print(f"Video Error: {e}")
        await send_notification(process_id, f"❌ فشل العملية: {str(e)}")
        background_tasks.add_task(close_connection, process_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ==============================================================================
# المرحلة 4: التعديلات (Feedback & Refining)
# ==============================================================================

@router.put("/edit/text", response_model=schemas.AssetResponse)
async def edit_ad_copy(
    request: schemas.EditTextRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الأصل
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset or asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found or unauthorized")

    # 2. استدعاء وكيل التعديل (يجب إضافة دالة refine_text في manager.py)
    process_id = f"edit_text_{request.asset_id}"
    try:    
        await send_notification(process_id, "✍️ جاري تعديل النص بناءً على ملاحظاتك...")
        updated_copy = await run_in_threadpool(
            manager.refine_text,
            current_copy=asset.ad_copy,
            feedback=request.feedback
        )
        if updated_copy and isinstance(updated_copy, dict) and "ad_copy" in updated_copy:
             actual_copy = updated_copy["ad_copy"]
        else:
             actual_copy = updated_copy
        # 3. حفظ النص الجديد
        if actual_copy:
            asset.ad_copy = actual_copy
            db.commit()
            db.refresh(asset)
            await send_notification(process_id, "✅ تم تعديل النص بنجاح!")
            background_tasks.add_task(close_connection, process_id)
            return asset
        else:
            await send_notification(process_id, "❌ فشل التعديل: AI لم يُعد النص المحدث")
            background_tasks.add_task(close_connection, process_id)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI failed to return updated text")
            
    except Exception as e:
        print(f"Edit Text Error: {e}")
        await send_notification(process_id, f"❌ فشل التعديل: {e}")
        background_tasks.add_task(close_connection, process_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/edit/image", response_model=schemas.ImageAssetResponse, status_code=status.HTTP_201_CREATED)
async def edit_image_asset(
    request: schemas.EditImageRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الصورة القديمة
    old_image = db.query(models.ImageAssets).join(models.CampaignAssets).join(models.Campaigns).filter(
        models.ImageAssets.id == request.image_id
    ).first()
    
    if not old_image or old_image.asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found or unauthorized")

    # 2. استدعاء الذكاء لتعديل البرومبت وتوليد صورة جديدة
    process_id = f"edit_image_{old_image.asset.id}"
    await send_notification(process_id, f"🎨 جاري رسم وتوليد الصورة لمنصة {old_image.platform}...")

    main_loop = asyncio.get_running_loop()
    def sync_notify(message: str):
        """
        هذه الدالة عادية (Sync)، يمكن استدعاؤها من أي مكان (حتى داخل Thread).
        وظيفتها إرسال الإشعار للـ Event Loop الرئيسي بأمان.
        """
        if main_loop.is_running():
            asyncio.run_coroutine_threadsafe(send_notification(process_id, message), main_loop)

    try:
        ai_result = await run_in_threadpool(
            manager.refine_image,
            current_prompt=old_image.prompt,
            feedback=request.feedback,
            aspect_ratio=old_image.aspect_ratio,
            original_image_path=old_image.asset.campaign.product.processed_image_url,
            current_image_path=old_image.image_url,
            notify_callback=sync_notify,
            event_name=old_image.event_name,
            event_angle=old_image.event_angle
        )
        
        image_path = ai_result.get("image_url")
        if not image_path:
            await send_notification(process_id, "❌ فشل التوليد: AI لم يُعد الصورة المحدثة")
            background_tasks.add_task(close_connection, process_id)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Image regeneration failed")
             
        filename = os.path.basename(image_path)
        public_image_url = f"{req.base_url}assets/image/{filename}"
        
        # 3. حفظ التعديل كصورة "جديدة" تابعة لنفس الـ Asset (Versioning)
        new_image = models.ImageAssets(
            asset_id=old_image.asset_id,
            image_url=public_image_url,
            prompt=ai_result.get("image_prompt"),
            aspect_ratio=old_image.aspect_ratio,
            platform=old_image.platform,
            event_name=old_image.event_name,
            event_angle=old_image.event_angle
        )
        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        
        await send_notification(process_id, "✅ تم تعديل الصورة بنجاح!")
        background_tasks.add_task(close_connection, process_id)

        return new_image

    except Exception as e:
        print(f"Edit Image Error: {e}")
        await send_notification(process_id, f"❌ فشل التعديل: {e}")
        background_tasks.add_task(close_connection, process_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/edit/video", response_model=schemas.VideoAssetResponse, status_code=status.HTTP_201_CREATED)
async def edit_video_asset(
    request: schemas.EditVideoRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    # 1. جلب الفيديو القديم
    old_video = db.query(models.VideoAssets).join(models.CampaignAssets).join(models.Campaigns).filter(
        models.VideoAssets.id == request.video_id
    ).first()
    
    if not old_video or old_video.asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found or unauthorized")

    process_id = f"edit_video_{old_video.asset.id}"
    await send_notification(process_id, "🎬 جاري كتابة السيناريو السينمائي (Storyboard)...")

    main_loop = asyncio.get_running_loop()
    def sync_notify(message: str):
        """
        هذه الدالة عادية (Sync)، يمكن استدعاؤها من أي مكان (حتى داخل Thread).
        وظيفتها إرسال الإشعار للـ Event Loop الرئيسي بأمان.
        """
        if main_loop.is_running():
            asyncio.run_coroutine_threadsafe(send_notification(process_id, message), main_loop)

    # 2. استدعاء الذكاء لتعديل الستوري بورد وتوليد فيديو جديد
    try:
        ai_result = await run_in_threadpool( 
            manager.refine_video,
            current_storyboard=old_video.video_storyboard,
            feedback=request.feedback,
            base_image_path=old_video.asset.campaign.product.processed_image_url,
            aspect_ratio=old_video.aspect_ratio,
            current_video_path=old_video.video_url,
            notify_callback=sync_notify,
            event_name=old_video.event_name,
            event_angle=old_video.event_angle
        )
        
        video_path = ai_result.get("video_url")
        if not video_path:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Video regeneration failed")
             
        filename = os.path.basename(video_path)
        public_video_url = f"{req.base_url}assets/video/{filename}"
        
        # 3. حفظ التعديل كفيديو "جديد" (Versioning)
        new_video = models.VideoAssets(
            asset_id=old_video.asset_id,
            video_url=public_video_url,
            video_storyboard=ai_result.get("video_storyboard"),
            duration_seconds=old_video.duration_seconds,
            aspect_ratio=old_video.aspect_ratio,
            event_name=old_video.event_name,
            event_angle=old_video.event_angle
        )
        db.add(new_video)
        db.commit()
        db.refresh(new_video)
        
        await send_notification(process_id, "✅ تم حفظ الفيديو في النظام.")
        background_tasks.add_task(close_connection, process_id)

        return new_video

    except Exception as e:
        print(f"Edit Video Error: {e}")
        await send_notification(process_id, f"❌ فشل العملية: {str(e)}")
        background_tasks.add_task(close_connection, process_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ==============================================================================
# المرحلة 4: الاعتماد النهائي للحملة (Approve)
# ==============================================================================
@router.put("/approve", response_model=schemas.AssetResponse)
def approve_asset(
    request: schemas.ApproveRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == request.asset_id).first()
    if not asset or asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    asset.is_approved = True
    db.commit()

    # التحقق من اكتمال الحملة
    total_assets = db.query(models.CampaignAssets).filter(models.CampaignAssets.campaign_id == asset.campaign_id).count()
    approved_assets = db.query(models.CampaignAssets).filter(
        models.CampaignAssets.campaign_id == asset.campaign_id,
        models.CampaignAssets.is_approved == True
    ).count()
    
    if total_assets == approved_assets:
        asset.campaign.status = "COMPLETED"
        db.commit()
        
    db.refresh(asset)
    return asset


# ==============================================================================
# باقي العمليات: استرجاع الإصدار القديم، حذف الحملة/الأصل، جلب الحملة/الأصول
# ==============================================================================

@router.get("/", response_model=List[schemas.CampaignResponse])
def get_user_campaigns(
    status: Optional[str] = None,    
    limit: Optional[int] = 10,
    skip: Optional[int] = 0,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    query = db.query(models.Campaigns)\
        .options(
            joinedload(models.Campaigns.assets).joinedload(models.CampaignAssets.images),
            joinedload(models.Campaigns.assets).joinedload(models.CampaignAssets.videos)
        )\
        .join(models.Products)\
        .filter(models.Products.user_id == current_user.id)
    
    if status:
        query = query.filter(models.Campaigns.status == status.upper())
    return query.limit(limit).offset(skip).all()
    
@router.get("/{campaign_id}", response_model=schemas.CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    campaign = db.query(models.Campaigns).options( 
            joinedload(models.Campaigns.assets).joinedload(models.CampaignAssets.images),
            joinedload(models.Campaigns.assets).joinedload(models.CampaignAssets.videos)
        )\
        .filter(models.Campaigns.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this campaign")
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
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

    background_tasks.add_task(cleanup_orphaned_files)

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/asset/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    asset = db.query(models.CampaignAssets).join(models.Campaigns).filter(models.CampaignAssets.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this asset")
    
    db.delete(asset)
    db.commit()

    total_assets = db.query(models.CampaignAssets).filter(models.CampaignAssets.campaign_id == asset.campaign_id).count()
    approved_assets = db.query(models.CampaignAssets).filter(
        models.CampaignAssets.campaign_id == asset.campaign_id,
        models.CampaignAssets.is_approved == True
    ).count()
    
    if total_assets == approved_assets:
        asset.campaign.status = "COMPLETED"
        db.commit()

    background_tasks.add_task(cleanup_orphaned_files)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/asset/image/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image_asset(
    image_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    image_asset = db.query(models.ImageAssets).join(models.CampaignAssets).join(models.Campaigns).filter(models.ImageAssets.id == image_id).first()
    if not image_asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image asset not found")
    if image_asset.asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this image asset")
    
    db.delete(image_asset)
    db.commit()

    background_tasks.add_task(cleanup_orphaned_files)

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/asset/video/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video_asset(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(oauth2.get_current_user)
):
    video_asset = db.query(models.VideoAssets).join(models.CampaignAssets).join(models.Campaigns).filter(models.VideoAssets.id == video_id).first()
    if not video_asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video asset not found")
    if video_asset.asset.campaign.product.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this video asset")
    
    db.delete(video_asset)
    db.commit()

    background_tasks.add_task(cleanup_orphaned_files)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/stream/{proccess_id}")
async def stream_notifications(proccess_id: str, request: Request):
    """
    الفرونت إند يتصل بهذا الرابط للاستماع للإشعارات.
    يظل الاتصال مفتوحاً حتى نرسل [DONE].
    """
    queue = get_queue(proccess_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    print(f"🔌 Client disconnected for process {proccess_id}.")
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=2.0)
                    if message == "[DONE]":
                        break
                    yield {"data": message}
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            print(f"🔌 Connection for {proccess_id} cancelled.")
        finally:
            if proccess_id in active_connections:
                del active_connections[proccess_id]  # تنظيف الطابور عند انتهاء الاتصال

    return EventSourceResponse(event_generator())


@router.get("/options/voices", response_model=schemas.VoiceListResponse, status_code=status.HTTP_200_OK)
def get_available_voices(request: Request):
    """
    يُرجع قائمة بجميع الأصوات المتاحة (النبرات) ليختار منها المستخدم في الواجهة الأمامية.
    """
    voices_list = []
    
    # تحويل قاموس AVAILABLE_VOICES إلى قائمة (List) ليفهمها الـ Frontend
    for voice_name, voice_data in AVAILABLE_VOICES.items():
        # 1. استخراج الوصف القصير
        short_desc = voice_data.get("description", "").split(" - ")[0]
        
        # 2. تجهيز رابط الاستعراض (Preview URL)
        raw_url = voice_data.get("url")
        full_preview_url = None
        
        if raw_url:
            # إذا كان الرابط يبدأ بـ assets (مسار محلي)، نقوم بتحويله لرابط قابل للتشغيل على النت
            if raw_url.startswith("assets"):
                # استبدال الـ backslashes (\) بـ forward slashes (/) لكي يعمل كـ URL في المتصفح
                clean_path = raw_url.replace("\\", "/")
                full_preview_url = f"{request.base_url}{clean_path}"
            else:
                # إذا كان الرابط خارجياً أصلاً (مثل https://...)
                full_preview_url = raw_url
        
        # 3. إضافته للقائمة
        voices_list.append({
            "name": voice_name,
            "description": short_desc,
            "preview_url": full_preview_url # 👈 الرابط الجاهز للتشغيل
        })
        
    return {"voices": voices_list}
