import os
import time
import base64
import requests
import google.auth.transport.requests
import mimetypes
from moviepy import ImageClip, AudioFileClip
from google.oauth2 import service_account
# تأكد من أن هذا الاستيراد يعمل عندك
from ..config import settings 

current_dir = os.path.dirname(os.path.abspath(__file__))

PROJECT_ID = settings.project_id
LOCATION = settings.location
MODEL_ID = settings.model_id
SERVICE_ACCOUNT_FILE = os.path.join(current_dir, "../../service_account.json")

def create_video_from_image_and_audio(image_path, audio_path, output_path=None):
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
        
        # إعدادات التصدير
        if not output_path:
            output_path = f"rawaj-frontend/assets/video_{os.urandom(4).hex()}.mp4"
            
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
    print(f"🚀 Starting generation for prompt: {prompt_text}")
    
    if image_path:
        print(f"🖼️  Using image input: {image_path}")
        if not os.path.exists(image_path):
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
    if image_path:
        mime_type, _ = mimetypes.guess_type(image_path)
        if not mime_type: mime_type = "image/png"
        
        with open(image_path, "rb") as image_file:
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
            "parameters": {"sampleCount": 1}
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
                            # إنشاء اسم ملف عشوائي
                            filename = f"rawaj-frontend/assets/veo_{os.urandom(4).hex()}.mp4"
                            # التأكد من وجود المجلد
                            os.makedirs(os.path.dirname(filename), exist_ok=True)
                            
                            # حفظ الملف
                            with open(filename, "wb") as f:
                                f.write(base64.b64decode(video_data))
                                
                            print(f"✅ Video generated successfully: {filename}")
                            return filename
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


if __name__ == "__main__" :
    # تأكد من المسار
    image_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\img_4747dbda.png"
    prompt = '''A montage of dynamic shots showcasing the Smart Fitness Tracker being used in various fitness activities (running, weightlifting, yoga) by a male model, focus on the device's display and data visualization, fast cuts, upbeat music, product demo, sweeping camera movements.'''
    generate_veo_video(
        prompt_text=prompt,
        image_path=image_path,
    )