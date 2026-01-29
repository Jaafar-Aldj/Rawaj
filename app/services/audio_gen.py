# from gtts import gTTS
import os
import os
import requests
from ..config import settings


# def generate_audio(text, output_path=None, lang='ar'):
#     """
#     تحويل النص إلى صوت (MP3)
#     """
#     try:
#         print(f"🎙️ Generating audio for text: {text[:30]}...")
        
#         tts = gTTS(text=text, lang=lang, slow=False)
        
#         if not output_path:
#             output_path = f"rawaj-frontend/assets/audio_{os.urandom(4).hex()}.mp3"
            
#         tts.save(output_path)
#         print(f"✅ Audio saved at: {output_path}")
#         return output_path

#     except Exception as e:
#         print(f"❌ Audio Generation Failed: {e}")
#         return None
    



def generate_audio_elevenlabs(text: str, output_path: str = None, voice_id: str = settings.elevenlabs_voice_id):
    """
    توليد صوت احترافي باستخدام ElevenLabs API.
    """
    if not settings.elevenlabs_api_key:
        print("❌ Error: ELEVENLABS_API_KEY missing in .env file.")
        return None

    # عنوان API الخاص بـ ElevenLabs لتوليد الصوت
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json"
    }

    # البيانات المطلوبة (نص، موديل الصوت)
    payload = {
        "text": text,
        "model_id": "eleven_multimodal_v2", # يمكنك اختيار موديل أفضل إذا أردت
        "voice_id": voice_id,
        "output_format": "mp3"
    }

    print(f"🎙️ Generating audio for text using ElevenLabs (Voice: {voice_id})...")

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status() # ارمِ خطأ إذا كان الرد غير ناجح

        if not output_path:
            output_path = f"rawaj-frontend/assets/audio_{os.urandom(4).hex()}.mp3"

        with open(output_path, "wb") as f:
            f.write(response.content)

        print(f"✅ Audio saved at: {output_path}")
        return output_path

    except requests.exceptions.RequestException as e:
        print(f"❌ Audio Generation Failed: {e}")
        if response is not None:
            print(f"Response Status Code: {response.status_code}")
            print(f"Response Text: {response.text}")
        return None
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        return None

# --- تجربة مباشرة عند تشغيل الملف ---
if __name__ == "__main__":
    test_text = "مرحباً، هذا اختبار للصوت الخاص بـ ElevenLabs."
    generate_audio_elevenlabs(test_text)