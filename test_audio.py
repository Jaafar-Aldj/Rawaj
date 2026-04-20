import os
import sys
from dotenv import load_dotenv

# التأكد من تحميل المتغيرات البيئية
load_dotenv()

# إضافة مسار التطبيق
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.audio_gen import generate_voiceover, generate_sfx, merge_video_audio

def run_audio_test():
    print("🚀 Starting Audio Testing Pipeline...")

    # ==========================================
    # 1. ضع مسار أي فيديو صامت لديك هنا
    # (يمكنك استخدام أحد الفيديوهات التي ولدتها سابقاً)
    # ==========================================
    static_video_path = r"rawaj-frontend\assets\video\veo_a97642bb.mp4" 

    if not os.path.exists(static_video_path):
        print(f"❌ Video not found at: {static_video_path}")
        print("💡 يرجى تعديل المسار في الكود ليطابق فيديو موجود لديك.")
        return

    # ==========================================
    # 2. اكتب النصوص التي تريد تجربتها
    # ==========================================
    voice_text = "اطلق العنان لحضورك الذي لا يُنسى. 'ماتش بي عود سافرون': عطرٌ فاخر يمنحك القوة والجاذبية بأناقة عصرية."
    
    sfx_prompt = "Deep, sophisticated orchestral music with an oud undertone, subtly building in intensity as the man applies the fragrance, then transitioning to a confident, alluring melody. Subtle ambient sound of a soft spray."

    # ==========================================
    # 3. التشغيل والدمج
    # ==========================================
    print("\n🎙️ 1. Generating Voiceover...")
    voice_path = generate_voiceover(voice_text, voice_profile_name="Farah")
    
    print("\n🔊 2. Generating Sound Effects...")
    sfx_path = generate_sfx(sfx_prompt, duration_seconds=8)
    
    if voice_path or sfx_path:
        print("\n🎬 3. Merging Audio with Static Video...")
        final_video = merge_video_audio(static_video_path, voice_path, sfx_path)
        print(f"\n🎉 SUCCESS! You can watch your video here:\n{final_video}")
    else:
        print("\n❌ Failed to generate audio files. Check your ElevenLabs API Key.")

if __name__ == "__main__":
    run_audio_test()