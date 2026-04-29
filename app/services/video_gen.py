import base64
import mimetypes
import os
import time
import glob
from google import genai
from google.genai import types
from ..config import settings 

current_dir = os.path.dirname(os.path.abspath(__file__))

from app.logger import get_logger
logger = get_logger(__name__)

VIDEO_DIR = "rawaj-frontend/assets/video"
os.makedirs(VIDEO_DIR, exist_ok=True)

client = genai.Client(api_key=settings.google_api_key)

VIDEO_MODELS = [
    "veo-3.1-generate-preview",
    "veo-3.0-generate-001"
]

def _download_and_save_video(operation, prefix="veo"):
    """دالة مساعدة لتحميل الفيديو من سيرفر جوجل وحفظه محلياً"""
    try:
        if not operation.response or not operation.response.generated_videos:
            logger.error("Google API returned empty response (possibly blocked by safety filter).")
            return None, None
        # استخراج كائن الفيديو من الرد
        video_obj = operation.response.generated_videos[0]
        
        # تحميل الملف فعلياً من سيرفر جوجل (الميزة الجديدة في الـ SDK)
        file_bytes = client.files.download(file=video_obj.video)
        
        # حفظه محلياً
        filename = f"{prefix}_{os.urandom(4).hex()}.mp4"
        output_path = os.path.join(VIDEO_DIR, filename)
        
        with open(output_path, "wb") as f:
            f.write(file_bytes)
            
        logger.info(f"Video successfully saved to: {output_path}")
        return output_path, video_obj.video # نُرجع الكائن (Video Object) لنستخدمه في التمديد لاحقاً!
    except Exception as e:
        logger.error(f"Error downloading/saving video: {e}")
        return None, None


def generate_veo_video(prompt_text: str, image_path: str = None, aspect_ratio: str = "16:9"):
    """
    توليد فيديو افتتاحي (8 ثواني) باستخدام Veo 3.
    """
    if settings.use_mock_api:
        logger.info(f"MOCKING VEO VIDEO GENERATION...")
        time.sleep(3) # محاكاة وقت التحميل للفرونت إند
        # البحث عن أي فيديو قديم تم توليده سابقاً في جهازك
        existing_videos = glob.glob(os.path.join(VIDEO_DIR, "veo_*.mp4"))
        if existing_videos:
            return existing_videos[0], "mock_google_id_123"
        return None, None
    logger.info(f"Starting initial Veo generation...")

    try:
        # 1. إعداد البرومبت
        kwargs = {
            "model": VIDEO_MODELS[1],
            "prompt": prompt_text,
            "config": types.GenerateVideosConfig(
                aspect_ratio=aspect_ratio,
                # person_generation="allow_adult" 
            )
        }

        # 2. إضافة الصورة المرجعية إذا وجدت
        if image_path and os.path.exists(image_path):
            logger.info(f"Reading reference image as Base64: {image_path}...")
            mime_type, _ = mimetypes.guess_type(image_path)
            if not mime_type: mime_type = "image/png"
            
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                
                # تمريرها بصيغة Dictionary كما يطلب الـ SDK
                kwargs["image"] = types.Image(
                    image_bytes=base64.b64decode(encoded_string), # הـ SDK يقبل البايتات المباشرة هنا
                    mime_type=mime_type
                )


        # 3. إطلاق عملية التوليد
        operation = client.models.generate_videos(**kwargs)
        logger.info(f"Operation started. Name: {operation.name}")

        # 4. انتظار انتهاء التوليد (Polling)
        while not operation.done:
            logger.info("Checking status... (Waiting 10s)")
            time.sleep(10)
            operation = client.operations.get(operation=operation)

        # 5. معالجة النتيجة
        if operation.error:
            logger.error(f"Generation failed: {operation.error}")
            return None, None
            
        # تحميل الفيديو وحفظه
        return _download_and_save_video(operation, prefix="veo")

    except Exception as e:
        logger.error(f"Veo API Error: {e}")
        return None, None


def extend_veo_video(prompt_text: str, previous_video_obj, aspect_ratio: str = "16:9"):
    """
    تمديد فيديو موجود مسبقاً (يضيف 7 ثواني).
    يستقبل `previous_video_obj` القادم من الدالة السابقة.
    """
    if settings.use_mock_api:
        logger.info(f"MOCKING VEO VIDEO EXTENSION...")
        time.sleep(3)
        existing_vids = glob.glob(os.path.join(VIDEO_DIR, "veo_ext_*.mp4")) or glob.glob(os.path.join(VIDEO_DIR, "veo_*.mp4"))
        if existing_vids:
            return existing_vids[0], "mock_google_id_extended"
        return None, None
    
    if not previous_video_obj:
        logger.error("Extension Error: No previous video object provided.")
        return None, None

    logger.info(f"Starting Veo extension...")

    try:
        operation = client.models.generate_videos(
            model= VIDEO_MODELS[0],
            prompt=prompt_text,
            video=previous_video_obj, 
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                resolution="720p" 
                # Aspect Ratio يتم وراثته تلقائياً من الفيديو الأصلي
            )
        )
        logger.info(f"Extension Operation started. Name: {operation.name}")

        # انتظار انتهاء التمديد
        while not operation.done:
            logger.info("Checking extension status... (Waiting 10s)")
            time.sleep(10)
            operation = client.operations.get(operation=operation)

        if operation.error:
            logger.error(f"Extension failed: {operation.error}")
            return None, None
            
        # تحميل الفيديو الممتد وحفظه
        return _download_and_save_video(operation, prefix="veo_ext")

    except Exception as e:
        logger.error(f"Veo Extension API Error: {e}")
        return None, None


if __name__ == "__main__":
    # اختبار سريع
    video_path, video_obj = generate_veo_video("A calm desert sunrise with gentle music", aspect_ratio="16:9")
    if video_path:
        print(f"Generated Video Path: {video_path}, Google Video ID: {video_obj}")
        