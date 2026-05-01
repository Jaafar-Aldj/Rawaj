from glob import glob
import os
from time import time
import uuid
from elevenlabs.client import ElevenLabs
from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip, concatenate_videoclips
from app.config import settings 
from google import genai

from app.logger import get_logger
logger = get_logger(__name__)

# إعداد العميل
client = ElevenLabs(api_key=settings.elevenlabs_api_key) 

# مسار حفظ الصوتيات المؤقتة
AUDIO_DIR = "rawaj-frontend/assets/video"
os.makedirs(AUDIO_DIR, exist_ok=True)

AVAILABLE_VOICES = {
    "Sara": {
        "id": "XTa3iQyMA6f1qrI4F6kZ", 
        "description": "Soft, warm female. Neutral Arabic with a modern flair. Ideal for lifestyle ads, AI assistants, and emotional storytelling.",
        "url" : r"assets\audio\sara.mp3"
    },
    "Adam": {
        "id": "OFHP1Qg30FPoNfkUFFlA", 
        "description": "Deep, rich male. Modern Standard Arabic (Fusha) and Egyptian dialect. Perfect for dramatic narrations, documentaries, and high-end products.",
        "url" : r"assets\audio\adam.mp3"
    },
    "Hamid": {
        "id": "A9ATTqUUQ6GHu0coCz8t", 
        "description": "Friendly, positive young male. Neutral Arabic. Great for upbeat, energetic ads and news-style content.",
        "url" : r"assets\audio\hamid.mp3"
    },
    "Ghaida": {
        "id": "rFDdsCQRZCUL8cPOWtnP", 
        "description": "Soft, warm female. Syrian (Levantine) dialect. Ideal for authentic, cultural, and emotional storytelling.",
        "url" : r"assets\audio\ghaida.mp3"
    },
    "Ahmed": {
        "id": "bHCN6EPPyN5hYpU9UVUz", 
        "description": "Clear, neutral middle-aged male. Modern Standard Arabic. Versatile for character voices and general narration.",
        "url" : r"assets\audio\ahmed.mp3"
    },
    "Khaled Alnajjar": {
        "id": "drMurExmkWVIH5nW8snR", 
        "description": "Strong, heavy melodious male. Formal Arabic. Symbolizes strength, chivalry, and luxury.",
        "url" : r"assets\audio\khaled_alnajjar.mp3"
    },
    "Jawad": {
        "id": "PmGnwGtnBs40iau7JfoF", 
        "description": "Natural, conversational male. Moroccan Darija dialect. Warm and highly approachable.",
        "url" : r"assets\audio\jawad.mp3"
    },
    "Chaouki": {
        "id": "G1HOkzin3NMwRHSq60UI",
        "description": "Deep, engaging male. Neutral Arabic. Brings authority, warmth, and clarity to documentaries and commercials.",
        "url" : r"assets\audio\chaouki.mp3"
    },
    "Farah": {
        "id": "4wf10lgibMnboGJGCLrP",
        "description": "Smooth, premium female. Levantine (Jordanian/Ammani) dialect. Perfect for high-end ads, podcasts, and modern digital content.",
        "url" : r"assets\audio\farah.mp3"
    },
    "Khalil": {
        "id": "NrhVFquWMOHTRNOAY8AO",
        "description": "Crisp, approachable male. Moroccan Arabic with a modern, neutral tone. Excellent for professional voiceovers.",
        "url" : r"assets\audio\khalil.mp3"
    },
    "Ghizlane": {
        "id": "OfGMGmhShO8iL9jCkXy8",
        "description": "Warm, dynamic female. Moroccan Darija dialect. Highly convincing and optimized for brand promotions and commercials.",
        "url" : r"assets\audio\ghizlane.mp3"
    },
    "Hamida": {
        "id": "JjTirzdD7T3GMLkwdd3a",
        "description": "Professional, positive middle-aged male. Classic radio-style voice (North African tone). Great for evocative audio ads.",
        "url" : r"assets\audio\hamida.mp3"
    }
}

def generate_voiceover(text: str, voice_profile_name: str = "Farah", target_video_duration: float = None, _attempt: int = 1) -> str:
    """توليد تعليق صوتي (TTS) باستخدام ElevenLabs مع حماية من الأخطاء والملفات العالقة"""
    if not text or text.lower() == "none" or text.strip() == "":
        return None

    if getattr(settings, "use_mock_api", False):
        import glob
        import time
        logger.info(f"MOCKING ELEVENLABS TTS...")
        time.sleep(1)
        existing_audio = glob.glob(os.path.join(AUDIO_DIR, "vo_*.mp3"))
        if existing_audio:
            return existing_audio[0]
        return None    
    
    logger.info(f"🗣️ Generating Voiceover (Attempt {_attempt}): {text[:30]}... with voice: {voice_profile_name}")
    output_path = os.path.join(AUDIO_DIR, f"vo_{uuid.uuid4().hex[:8]}.mp3")
    
    try:
        voice_data = AVAILABLE_VOICES.get(voice_profile_name, AVAILABLE_VOICES["Farah"])
        voice_id = voice_data["id"] 
        
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id, 
            model_id="eleven_multilingual_v2", 
            output_format="mp3_44100_128"
        )
        
        with open(output_path, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)
        
        if not target_video_duration:
            return output_path

        # 👈 التعديل الثاني (الأهم لحل WinError 32): إغلاق الملف فوراً بعد قراءة مدته!
        temp_audio_clip = AudioFileClip(output_path)
        audio_duration = temp_audio_clip.duration
        temp_audio_clip.close() # 🛑 تحرير الملف من قبضة نظام الويندوز!
        
        if audio_duration > target_video_duration + 0.5:
            if _attempt >= 2:
                logger.warning(f"⚠️ Audio is still slightly long after shortening. MoviePy will trim it to fit.")
                return output_path
                
            logger.info("⚠️ Audio is TOO LONG! Triggering AI Auto-Correction...")
            try:
                os.remove(output_path)
                logger.info(f"🧹 Removed original long audio successfully.") 
            except Exception as e:
                logger.warning(f"⚠️ Failed to remove original audio file: {e}")
            
            # اختصار النص وإعادة الاستدعاء الذاتي
            new_text = shorten_voiceover_text(text, target_video_duration)
            return generate_voiceover(new_text, voice_profile_name, target_video_duration, _attempt=_attempt + 1)
            
        else:
            logger.info("✅ Audio fits the video perfectly.")
            return output_path

    except Exception as e:
        logger.error(f"❌ ElevenLabs TTS Failed: {e}")
        return None
    

def merge_video_audio(video_path: str, voice_path: str = None) -> str:
    """
    دمج الفيديو الصامت مع التعليق الصوتي والمؤثرات.
    """
    if not video_path or not os.path.exists(video_path):
        return video_path

    if not voice_path :
        return video_path

    logger.info("🎬 Merging Voiceover & Video using MoviePy...")
    output_path = video_path.replace(".mp4", f"_audio_{uuid.uuid4().hex[:4]}.mp4")

    video = None
    voice_clip = None
    final_audio = None

    try:
        video = VideoFileClip(video_path)
        audio_tracks = []

        if video.audio:
            veo_audio = video.audio.with_volume_scaled(0.6)
            audio_tracks.append(veo_audio)

        # 1. معالجة التعليق الصوتي (Voiceover)
        if voice_path and os.path.exists(voice_path):
            voice_clip = AudioFileClip(voice_path)
            # رفع مستوى الصوت ليكون المعلق هو الأوضح
            voice_clip = voice_clip.with_volume_scaled(1.2) 
        
            if voice_clip.duration > video.duration:
                logger.info(f"⚠️ Voiceover ({voice_clip.duration}s) still slightly longer than video ({video.duration}s). Trimming audio...")
                voice_clip = voice_clip.with_duration(video.duration)

            audio_tracks.append(voice_clip)

        # 3. الدمج النهائي
        if audio_tracks:
            final_audio = CompositeAudioClip(audio_tracks)
            final_video = video.with_audio(final_audio)
            
            final_video.write_videofile(
                output_path, 
                codec="libx264", 
                audio_codec="aac",
                preset="ultrafast",
                logger=None 
            )
            logger.info(f"✅ Final video with audio saved: {output_path}")
            return output_path
        
        return video_path

    except Exception as e:
        logger.error(f"❌ Audio Merge Failed: {e}")
        return video_path 
        
    finally:

        if video: video.close()
        if voice_clip: voice_clip.close()
        if final_audio: final_audio.close()
        
        try:
            if voice_path and os.path.exists(voice_path): 
                os.remove(voice_path)
                logger.info(f"✅ Temporary audio file removed: {voice_path}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to remove temporary audio file: {e}")



def shorten_voiceover_text(original_text: str, target_duration: float) :
    """
    يطلب من الذكاء الاصطناعي تقصير النص ليتناسب مع المدة الزمنية المطلوبة بدقة عالية.
    """
    try:
        logger.info(f"🧠 AI is rewriting the voiceover to fit {target_duration} seconds...")
        client = genai.Client(api_key=settings.google_api_key)
        
        target_words = max(5, int(target_duration * 1.3))
        
        prompt = f"""
        You are an expert Arabic voiceover copywriter.
        The following text is too long to fit in a {target_duration}-second video scene.
        
        Original Text: "{original_text}"
        
        TASK: 
        Rewrite the text so it is EXTREMELY SHORT and punchy. It MUST be a MAXIMUM of {target_words} Arabic words.
        If it exceeds {target_words} words, the audio will fail to sync with the video. Cut out unnecessary adjectives.
        Keep the core marketing message intact. 
        CRITICAL: DO NOT use any digits (e.g., 10, 50). Spell out all numbers in Arabic words.
        OUTPUT ONLY THE ARABIC TEXT. No quotes, no explanations.
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        new_text = response.text.strip().replace('"', '')
        logger.info(f"✂️ Text shortened! New Text: {new_text}")
        return new_text
        
    except Exception as e:
        logger.warning(f"⚠️ Error shortening text: {e}")
        return original_text
    
