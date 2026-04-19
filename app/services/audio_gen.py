import os
import uuid
from elevenlabs.client import ElevenLabs
from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip
from app.config import settings 

# إعداد العميل
client = ElevenLabs(api_key=settings.elevenlabs_api_key) 

# مسار حفظ الصوتيات المؤقتة
AUDIO_DIR = "rawaj-frontend/assets/video"
os.makedirs(AUDIO_DIR, exist_ok=True)

def generate_voiceover(text: str) -> str:
    """توليد تعليق صوتي (TTS) باستخدام ElevenLabs"""
    if not text or text.lower() == "none" or text.strip() == "":
        return None
        
    print(f"🗣️ Generating Voiceover: {text[:30]}...")
    output_path = os.path.join(AUDIO_DIR, f"vo_{uuid.uuid4().hex[:8]}.mp3")
    
    try:
        # استخدام الصوت المحدد في الإعدادات (أو صوت عربي افتراضي إذا لم يوجد)
        voice_id = getattr(settings, "elevenlabs_voice_id", "JBFqnCBsd6RMkjVDRZzb") 
        
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id, 
            model_id="eleven_multilingual_v2", # الموديل الداعم للعربية
            output_format="mp3_44100_128"
        )
        
        with open(output_path, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)
        
        print("✅ Voiceover saved successfully.")
        return output_path

    except Exception as e:
        print(f"❌ ElevenLabs TTS Failed: {e}")
        return None

def generate_sfx(prompt: str, duration_seconds: int = 8) -> str:
    """توليد مؤثرات صوتية (Sound Effects) باستخدام ElevenLabs"""
    if not prompt or prompt.lower() == "none" or prompt.strip() == "":
        return None
        
    print(f"🔊 Generating SFX: {prompt[:30]}...")
    output_path = os.path.join(AUDIO_DIR, f"sfx_{uuid.uuid4().hex[:8]}.mp3")
    
    try:
        result = client.text_to_sound_effects.convert(
            text=prompt,
            duration_seconds=duration_seconds, 
            prompt_influence=0.5
        )
        
        with open(output_path, "wb") as f:
            for chunk in result:
                if chunk:
                    f.write(chunk)
                
        print("✅ SFX saved successfully.")
        return output_path

    except Exception as e:
        print(f"❌ ElevenLabs SFX Failed: {e}")
        return None

def merge_video_audio(video_path: str, voice_path: str = None, sfx_path: str = None) -> str:
    """
    دمج الفيديو الصامت مع التعليق الصوتي والمؤثرات.
    """
    if not video_path or not os.path.exists(video_path):
        return video_path

    if not voice_path and not sfx_path:
        return video_path # لا يوجد صوت لدمجه

    print("🎬 Merging Audio & Video using MoviePy...")
    output_path = video_path.replace(".mp4", f"_audio_{uuid.uuid4().hex[:4]}.mp4")

    video = None
    voice_clip = None
    sfx_clip = None
    final_audio = None

    try:
        video = VideoFileClip(video_path)
        audio_tracks = []

        # 1. معالجة التعليق الصوتي (Voiceover)
        if voice_path and os.path.exists(voice_path):
            voice_clip = AudioFileClip(voice_path)
            # رفع مستوى الصوت ليكون المعلق هو الأوضح
            voice_clip = voice_clip.with_volume_scaled(1.5) 
            
            # إذا كان الصوت أطول من الفيديو، نقص الصوت (أو نسرعه، لكن القص أأمن)
            if voice_clip.duration > video.duration:
                print("⚠️ Voiceover is longer than video. Trimming audio.")
                voice_clip = voice_clip.subclipped(0, video.duration)
                
            audio_tracks.append(voice_clip)

        # 2. معالجة المؤثرات والموسيقى (SFX)
        if sfx_path and os.path.exists(sfx_path):
            sfx_clip = AudioFileClip(sfx_path)
            
            # إذا كانت الموسيقى أقصر من الفيديو، نكررها (Loop)
            if sfx_clip.duration < video.duration:
                # تكرار الموسيقى لتغطي الفيديو
                sfx_clip = sfx_clip.loop(duration=video.duration)
            else:
                sfx_clip = sfx_clip.subclipped(0, video.duration)
            
            # خفض مستوى الموسيقى لكي لا تطغى على المعلق
            volume_level = 0.3 if voice_path else 0.8
            sfx_clip = sfx_clip.with_volume_scaled(volume_level) 
            audio_tracks.append(sfx_clip)

        # 3. الدمج النهائي
        if audio_tracks:
            final_audio = CompositeAudioClip(audio_tracks)
            # تعيين الصوت للفيديو
            final_video = video.with_audio(final_audio)
            
            # رندرة الفيديو النهائي (بأسرع إعدادات ممكنة لعدم تعطيل السيرفر)
            final_video.write_videofile(
                output_path, 
                codec="libx264", 
                audio_codec="aac",
                preset="ultrafast",
                logger=None # إخفاء شريط التحميل من الكونسول
            )
            print(f"✅ Final video with audio saved: {output_path}")
            return output_path
        
        return video_path

    except Exception as e:
        print(f"❌ Audio Merge Failed: {e}")
        return video_path # في حال فشل الدمج، نرجع الفيديو الصامت
        
    finally:
        # 🧹 تنظيف الذاكرة (Memory Leak Prevention)
        if video: video.close()
        if voice_clip: voice_clip.close()
        if sfx_clip: sfx_clip.close()
        if final_audio: final_audio.close()
        
        # حذف الملفات الصوتية المؤقتة لتوفير المساحة
        try:
            if voice_path and os.path.exists(voice_path): os.remove(voice_path)
            if sfx_path and os.path.exists(sfx_path): os.remove(sfx_path)
        except: pass