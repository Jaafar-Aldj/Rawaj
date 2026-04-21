import os
import sys
from dotenv import load_dotenv

# التأكد من تحميل المتغيرات البيئية
load_dotenv()

# إضافة مسار التطبيق
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.audio_gen import generate_voiceover, merge_video_audio

def run_audio_test():
    print("🚀 Starting Audio Testing Pipeline...")

    # ==========================================
    # 1. ضع مسار أي فيديو صامت لديك هنا
    # (يمكنك استخدام أحد الفيديوهات التي ولدتها سابقاً)
    # ==========================================
    static_video_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\video\veo_d734605f.mp4" 

    if not os.path.exists(static_video_path):
        print(f"❌ Video not found at: {static_video_path}")
        print("💡 يرجى تعديل المسار في الكود ليطابق فيديو موجود لديك.")
        return

    # ==========================================
    # 2. اكتب النصوص التي تريد تجربتها
    # ==========================================
    voice_text = "موديل الف وتسعمئة واثنان وسبعون متينة ودقيقة. استثمار يزيد إنتاجيتكم. اتصلوا بنا اليوم!"
    

    # ==========================================
    # 3. التشغيل والدمج
    # ==========================================
    print("\n🎙️ 1. Generating Voiceover...")
    voice_path = generate_voiceover(voice_text, voice_profile_name="Chaouki")  # يمكنك تجربة أصوات أخرى مثل "Ghizlane", "Hamida", "Noura"
    
    
    if voice_path :
        print("\n🎬 3. Merging Audio with Static Video...")
        final_video = merge_video_audio(static_video_path, voice_path)
        print(f"\n🎉 SUCCESS! You can watch your video here:\n{final_video}")
    else:
        print("\n❌ Failed to generate audio files. Check your ElevenLabs API Key.")

if __name__ == "__main__":
    run_audio_test()