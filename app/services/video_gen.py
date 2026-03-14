import os
import time
import base64
import requests
import google.auth.transport.requests
import mimetypes
from moviepy import ImageClip, AudioFileClip, VideoFileClip
from google.oauth2 import service_account
# تأكد من أن هذا الاستيراد يعمل عندك
from ..config import settings 

current_dir = os.path.dirname(os.path.abspath(__file__))

PROJECT_ID = settings.project_id
LOCATION = settings.location
MODEL_ID = settings.model_id
SERVICE_ACCOUNT_FILE = os.path.join(current_dir, "../../service_account.json")

VIDEO_DIR = "rawaj-frontend/assets/video"
os.makedirs(VIDEO_DIR, exist_ok=True)

def create_video_from_image_and_audio(image_path, audio_path):
    """
    إنشاء فيديو بسيط: صورة ثابتة + صوت + تأثير زووم (اختياري)
    """
    try:
        print("🎬 Creating video...")
        
        # تحميل الملفات
        audio = AudioFileClip(audio_path)
        image = ImageClip(image_path).with_duration(audio.duration)
        
        # دمج الصوت مع الصورة
        video = image.with_audio(audio)
    
        unique_filename =  f"video_{os.urandom(4).hex()}.mp4"
        output_path = os.path.join(VIDEO_DIR, unique_filename)
            
        # الرندرة (هذه العملية تأخذ وقتاً)
        video.write_videofile(output_path, fps=24, codec="libx264", audio_codec="aac")
        
        print(f"✅ Video saved at: {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Video Creation Failed: {e}")
        return 


def get_access_token():
    """الحصول على توكن المصادقة باستخدام ملف JSON"""
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    return credentials.token


def generate_veo_video(prompt_text: str, image_path: str = None):
    if not image_path:
        print(f"❌ No image provided. Veo model requires an image input.")
        return None
    
    if "image/" in image_path:
        filename = image_path.split("image/")[-1]
        local_path = os.path.join("rawaj-frontend", "assets", "image", filename)
    elif "upload/" in image_path: # إضافة دعم مجلد الرفع هنا أيضاً
            filename = image_path.split("upload/")[-1]
            local_path = os.path.join("rawaj-frontend", "assets", "upload", filename)
    else:
        local_path = image_path # افتراض أنه مسار محلي


    if local_path:
        print(f"🖼️  Using image input: {local_path}")
        if not os.path.exists(local_path):
            print(f"❌ Image file not found: {image_path}")
            return None
    try:
        access_token = get_access_token()
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        return None

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }

    # تجهيز البيانات
    instance = {"prompt": prompt_text}

    # معالجة الصورة
    if local_path:
        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type: mime_type = "image/png"
        
        with open(local_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            instance["image"] = {
                "bytesBase64Encoded": encoded_string,
                "mimeType": mime_type 
            }

    # الروابط
    base_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}"
    start_url = f"{base_url}:predictLongRunning"
    
    # 1. إرسال طلب البدء
    try:
        response = requests.post(start_url, headers=headers, json={
            "instances": [instance],
            "parameters": {
                "sampleCount": 1, 
                "safetySetting": "block_only_high", 
                "personGeneration": "allow_all",
                "negativePrompt": "text, typography, labels, watermarks, subtitles, words, letters, writing" 
            }
        }, timeout=30) # تايم أوت للطلب الأول
        
        if response.status_code != 200:
            print(f"❌ Error starting generation ({response.status_code}):", response.text)
            return None
            
        operation_name = response.json()["name"]
        print(f"⏳ Operation started. ID: {operation_name}")

    except Exception as e:
        print(f"❌ Connection Error during start: {e}")
        return None

    # 2. حلقة الانتظار (Polling Loop)
    check_url = f"{base_url}:fetchPredictOperation"
    start_time = time.time()
    
    while True:
        elapsed = int(time.time() - start_time)
        print(f"Checking status... (Elapsed: {elapsed}s)")
        
        try:
            # ✅ إضافة Timeout لمنع التجمد
            check_response = requests.post(
                check_url, 
                headers=headers, 
                json={"operationName": operation_name},
                timeout=120
            )
            
            if check_response.status_code != 200:
                print(f"⚠️ Polling warning ({check_response.status_code}). Retrying...")
                time.sleep(10)
                continue

            result = check_response.json()

            if "done" in result and result["done"]:
                if "error" in result:
                    print("❌ Generation failed:", result["error"])
                    return None
                
                # --- (التعديل هنا) استخراج الفيديو بشكل صحيح ---
                try:
                    # 1. نتأكد من وجود الفيديو في الاستجابة
                    if "response" in result and "videos" in result["response"]:
                        video_obj = result["response"]["videos"][0]
                        
                        # 2. نبحث عن الفيديو سواء بالاسم الجديد أو القديم
                        video_data = video_obj.get("bytesBase64Encoded") or video_obj.get("videoBytes")

                        if video_data:
                            
                            filename = f"veo_{os.urandom(4).hex()}.mp4"
                            output_path = os.path.join(VIDEO_DIR, filename)
                            # التأكد من وجود المجلد
                            os.makedirs(os.path.dirname(output_path), exist_ok=True)
                            
                            # حفظ الملف
                            with open(output_path, "wb") as f:
                                f.write(base64.b64decode(video_data))
                                
                            print(f"✅ Video generated successfully: {output_path}")
                            return output_path
                        else:
                            print("❌ 'videos' list exists but no video data key found.")
                            return None
                    else:
                        print("❌ No video found in successful response.")
                        return None

                except Exception as e:
                    print(f"❌ Error saving video: {e}")
                    return None
            
        except requests.exceptions.Timeout:
            print("⚠️ Timeout checking status. Network is slow, retrying...")
        except Exception as e:
            print(f"⚠️ Error checking status: {e}")

        # انتظار قبل المحاولة التالية
        time.sleep(10)



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
        
        return output_path
    except Exception as e:
        print(f"❌ Merge Failed: {e}")
        return video_path # نرجع الفيديو الصامت كحل بديل



if __name__ == "__main__" :
    # تأكد من المسار
    image_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\image\gen_76282eb1.png"
    prompt = '''A short, dynamic video showcasing the navy captain's hat rotating slowly on a turntable against a neutral background. The camera slowly zooms in to highlight key features such as the brim, insignia, and stitching. Use smooth, controlled camera movements. The video ends with a title card displaying the product name and a call to action. [Hat + Slow Rotation + Zoom In + Product Demo]'''
    generate_veo_video(
        prompt_text=prompt,
        image_path=image_path,
    )