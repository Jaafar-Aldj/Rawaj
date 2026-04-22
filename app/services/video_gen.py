import base64
import mimetypes
import os
import time
from google import genai
from google.genai import types
from moviepy import AudioFileClip, VideoFileClip
from google.oauth2 import service_account
from ..config import settings 

current_dir = os.path.dirname(os.path.abspath(__file__))

PROJECT_ID = settings.project_id
LOCATION = settings.location
MODEL_ID = settings.model_id
SERVICE_ACCOUNT_FILE = os.path.join(current_dir, "../../service_account.json")

VIDEO_DIR = "rawaj-frontend/assets/video"
os.makedirs(VIDEO_DIR, exist_ok=True)

client = genai.Client(api_key=settings.google_api_key)

def _download_and_save_video(operation, prefix="veo"):
    """دالة مساعدة لتحميل الفيديو من سيرفر جوجل وحفظه محلياً"""
    try:
        if not operation.response or not operation.response.generated_videos:
            print("❌ Google API returned empty response (possibly blocked by safety filter).")
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
            
        print(f"✅ Video successfully saved to: {output_path}")
        return output_path, video_obj.video # نُرجع الكائن (Video Object) لنستخدمه في التمديد لاحقاً!
    except Exception as e:
        print(f"❌ Error downloading/saving video: {e}")
        return None, None


def generate_veo_video(prompt_text: str, image_path: str = None, aspect_ratio: str = "16:9"):
    """
    توليد فيديو افتتاحي (8 ثواني) باستخدام Veo 3.
    """
    print(f"🎬 Starting initial Veo generation...")
    
    try:
        # 1. إعداد البرومبت
        kwargs = {
            "model": "veo-3.0-fast-generate-001",
            "prompt": prompt_text,
            "config": types.GenerateVideosConfig(
                aspect_ratio=aspect_ratio,
                person_generation="allow_adult" 
            )
        }

        # 2. إضافة الصورة المرجعية إذا وجدت
        if image_path and os.path.exists(image_path):
            print(f"🖼️ Reading reference image as Base64: {image_path}...")
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
        print(f"⏳ Operation started. Name: {operation.name}")

        # 4. انتظار انتهاء التوليد (Polling)
        while not operation.done:
            print("Checking status... (Waiting 10s)")
            time.sleep(10)
            operation = client.operations.get(operation=operation)

        # 5. معالجة النتيجة
        if operation.error:
            print(f"❌ Generation failed: {operation.error}")
            return None, None
            
        # تحميل الفيديو وحفظه
        return _download_and_save_video(operation, prefix="veo")

    except Exception as e:
        print(f"❌ Veo API Error: {e}")
        return None, None


def extend_veo_video(prompt_text: str, previous_video_obj, aspect_ratio: str = "16:9"):
    """
    تمديد فيديو موجود مسبقاً (يضيف 7 ثواني).
    يستقبل `previous_video_obj` القادم من الدالة السابقة.
    """
    if not previous_video_obj:
        print("❌ Extension Error: No previous video object provided.")
        return None, None

    print(f"🎬 Starting Veo extension...")

    try:
        operation = client.models.generate_videos(
            model="veo-3.1-generate-preview",
            prompt=prompt_text,
            video=previous_video_obj, 
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                resolution="720p" 
                # Aspect Ratio يتم وراثته تلقائياً من الفيديو الأصلي
            )
        )
        print(f"⏳ Extension Operation started. Name: {operation.name}")

        # انتظار انتهاء التمديد
        while not operation.done:
            print("Checking extension status... (Waiting 10s)")
            time.sleep(10)
            operation = client.operations.get(operation=operation)

        if operation.error:
            print(f"❌ Extension failed: {operation.error}")
            return None, None
            
        # تحميل الفيديو الممتد وحفظه
        return _download_and_save_video(operation, prefix="veo_ext")

    except Exception as e:
        print(f"❌ Veo Extension API Error: {e}")
        return None, None


def merge_video_with_audio(video_path, audio_path):
    """دمج فيديو Veo المتحرك مع صوت ElevenLabs"""
    try:
        print("🎬 Merging video with audio...")
        video_clip = VideoFileClip(video_path)
        audio_clip = AudioFileClip(audio_path)
        
        # تكرار الفيديو أو قص الصوت ليتناسبا
        # الأسهل: قص الصوت ليتناسب مع الفيديو، أو تكرار الفيديو
        final_duration = min(video_clip.duration, audio_clip.duration)
        # أو نجعل الفيديو بطول الصوت (loop)
        if audio_clip.duration > video_clip.duration:
             # تكرار الفيديو
             video_clip = video_clip.loop(duration=audio_clip.duration)
        
        final_clip = video_clip.with_audio(audio_clip)
        
        output_path = video_path.replace(".mp4", "_audio.mp4")
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")

        video_clip.close()
        audio_clip.close()
        final_clip.close()
        
        return output_path
    except Exception as e:
        print(f"❌ Merge Failed: {e}")
        return video_path 

