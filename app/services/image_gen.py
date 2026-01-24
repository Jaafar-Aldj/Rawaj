import os
import requests
import base64
from ..config import settings

API_KEY = settings.google_api_key

def generate_image_with_imagen(prompt, model_name="imagen-4.0-fast-generate-001"):
    """
    توليد صورة باستخدام موديلات Imagen 4.0 عبر Google API
    """
    if not API_KEY:
        print("❌ Error: API Key missing.")
        return None

    # الرابط الخاص بـ Predict
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:predict?key={API_KEY}"

    # تجهيز الطلب
    payload = {
        "instances": [
            {
                "prompt": prompt
            }
        ],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "16:9"
        }
    }

    print(f"🎨 Generating image using {model_name}...")
    
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            # استخراج الصورة (تأتي مشفرة بـ Base64)
            b64_image = result['predictions'][0]['bytesBase64Encoded']
            # فك التشفير وحفظ الصورة
            image_data = base64.b64decode(b64_image)
            # التأكد من وجود مجلد للصور
            os.makedirs("rawaj-frontend/assets", exist_ok=True)
            # حفظ باسم عشوائي
            filename = f"rawaj-frontend/assets/img_{os.urandom(4).hex()}.png"
            with open(filename, "wb") as f:
                f.write(image_data)
            print(f"✅ Image saved at: {filename}")
            return filename
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

if __name__ == "__main__":
    test_prompt = "A futuristic coffee cup floating in space, cinematic lighting, hyper realistic."
    generate_image_with_imagen(test_prompt)