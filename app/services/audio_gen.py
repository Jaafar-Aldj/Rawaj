import math
import os
import uuid
from elevenlabs.client import ElevenLabs
from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip, concatenate_videoclips
from app.config import settings 

# إعداد العميل
client = ElevenLabs(api_key=settings.elevenlabs_api_key) 

# مسار حفظ الصوتيات المؤقتة
AUDIO_DIR = "rawaj-frontend/assets/video"
os.makedirs(AUDIO_DIR, exist_ok=True)

AVAILABLE_VOICES = {
    "Sara": {
        "id": "XTa3iQyMA6f1qrI4F6kZ", 
        "description": "Soft, Expressive, and Warm. EchoAura — The Voice of Emotion & Clarity - EchoAura is a warm, expressive female voice designed to bring stories and scripts to life. Its tone balances natural clarity with emotional depth, making it perfect for audiobooks, AI assistants, educational videos, and ads. This voice smoothly blends Arabic and English accents, reflecting the modern authenticity of the Middle East. Clear, versatile, and humanlike — EchoAura turns every word into emotion.",
        "url" : r"assets\audio\voice_preview_sara - soft, expressive, and warm.mp3"
    },
    "Adam": {
        "id": "OFHP1Qg30FPoNfkUFFlA", 
        "description": "Deep, Rich and Expressive. Adam - Narrator - Experience a rich, expressive Arabic voice that blends clarity with warmth — perfect for narrations, audiobooks, documentaries, and emotional storytelling. This voice features precise articulation, natural pacing, and a versatile emotional range — from calm and reflective to powerful and dramatic. Ideal for content that requires a genuine human touch, whether in Modern Standard Arabic or colloquial Egyptian. A trustworthy voice that elevates your message and keeps your audience engaged.",
        "url" : r"assets\audio\voice_preview_adam - deep, rich, and expressive.mp3"
    },
    "Hamid": {
        "id": "A9ATTqUUQ6GHu0coCz8t", 
        "description": "Friendly, Natural and Positive. Hamid - Young voice male with a pleasant tone. Perfect for news.",
        "url" : r"assets\audio\voice_preview_hamid - friendly, natural, and positive.mp3"
    },
    "Ghaida": {
        "id": "rFDdsCQRZCUL8cPOWtnP", 
        "description": "Soft, Warm and Expressive. Ghaidā - Stories of Syria - Soft and warm stories are told by Syrian women - this is the very first! Ghaidā’ brings the gentle strength and emotional depth of the Arabic language to life. A dynamic female voice with a calm yet expressive tone, ideal for storytelling, documentaries, educational projects, and cultural narration. Her delivery moves between warmth and clarity, carrying the rhythm, truth, and authenticity of modern Syrian storytelling - a voice that connects memory, emotion, and meaning.",
        "url" : r"assets\audio\voice_preview_ghaida - soft, warm, and expressive.mp3"
    },
    "Ahmed": {
        "id": "bHCN6EPPyN5hYpU9UVUz", 
        "description": "Clear, Natural and Neutral. Ahmed - Middle-aged male voice. Works well for characters & Animation.",
        "url" : r"assets\audio\voice_preview_ahmed - clear, natural, and neutral.mp3"
    },
    "Khaled Alnajjar": {
        "id": "drMurExmkWVIH5nW8snR", 
        "description": "Strong and Expressive. Khaled Alnajjar - A heavy, melodious Arabic voice that symbolizes strength and chivalry. It is eloquent and expresses feelings and emotions, making you feel as if you are seeing the voice.",
        "url" : r"assets\audio\voice_preview_khaled_alnajjar - strong and expressive.mp3"
    },
    "Jawad": {
        "id": "PmGnwGtnBs40iau7JfoF", 
        "description": "Natural and Conversational. Jawad - Moroccan Darija - Warm and clear Arabic Moroccan Darija male voice, natural and conversational.",
        "url" : r"assets\audio\voice_preview_jawad - natural and conversational.mp3"
    },
    "Chaouki": {
        "id": "G1HOkzin3NMwRHSq60UI",
        "description": "Deep, Clear and Engaging. Chaouki - A deep, clear male voice with a neutral Arabic accent, ideal for documentaries, events, and commercials. I offer a smooth, engaging delivery that brings authority and warmth, making my voice versatile for both informative and promotional content.",
        "url" : r"assets\audio\voice_preview Chaouki - deep, clear, and engaging.mp3"
    },
    "Farah": {
        "id": "4wf10lgibMnboGJGCLrP",
        "description": "Smooth, Calm and Warm. Farah - Premium Arabic Female Voice - A premium Arabic female voice with a warm, clear, and expressive tone, ideal for ads, narration, storytelling, audiobooks, YouTube content, podcasts, educational videos, and AI avatars. Features a natural Levantine accent (Jordanian/Ammani) blended with modern Arabic fluency and subtle English code-switching — perfect for today’s digital audience. Tested in production environments, including AI content, media, and voice assistant applications.",
        "url" : r"assets\audio\voice_preview_farah - smooth, calm, and warm.mp3"
    },
    "Khalil": {
        "id": "NrhVFquWMOHTRNOAY8AO",
        "description": "Crisp and Approachable. A clear, well-paced Moroccan male voice with a modern, neutral tone. He speaks with natural ease and understated warmth, making him a versatile fit for narration, informational content, or professional voiceover projects.",
        "url" : r"assets\audio\voice_preview_khalil - crisp and approachable.mp3"
    },
    "Ghizlane": {
        "id": "OfGMGmhShO8iL9jCkXy8",
        "description": "Warm, Natural and Encouraging. Ghizlane - Moroccan Darija Dialect - A natural, dynamic, and expressive voice in Darija (Moroccan Arabic), optimized for commercial use. Ideal for advertising, brand promotions, and professional narrations, with a warm, convincing, and engaging tone.",
        "url" : r"assets\audio\voice_preview_ghizlane - warm, natural, and encouraging.mp3"
    },
    "Hamida": {
        "id": "JjTirzdD7T3GMLkwdd3a",
        "description": "Professional and Positive. HMIDA - Middle aged male voice suitable for radio. When listening to the broadcaster's voice without watching it, his voice may raise a degree of emotions and mental images that the listener relies on, without awareness, to imagine the features of the speaker and the suggestions of his words or mental images, and the radio voice creates a fingerprint and An accurate auditory in the mind of the listener.",
        "url" : r"assets\audio\voice_preview_hamida - professional and positive.mp3"
    }
}

def generate_voiceover(text: str, voice_profile_name: str = "Farah") -> str:
    """توليد تعليق صوتي (TTS) باستخدام ElevenLabs"""
    if not text or text.lower() == "none" or text.strip() == "":
        return None
        
    print(f"🗣️ Generating Voiceover: {text[:30]}...")
    output_path = os.path.join(AUDIO_DIR, f"vo_{uuid.uuid4().hex[:8]}.mp3")
    
    try:
        voice_data = AVAILABLE_VOICES.get(voice_profile_name, AVAILABLE_VOICES["Farah"])
        voice_id = voice_data["id"] 
        
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


def merge_video_audio(video_path: str, voice_path: str = None) -> str:
    """
    دمج الفيديو الصامت مع التعليق الصوتي والمؤثرات.
    """
    if not video_path or not os.path.exists(video_path):
        return video_path

    if not voice_path :
        return video_path

    print("🎬 Merging Voiceover & Video using MoviePy...")
    output_path = video_path.replace(".mp4", f"_audio_{uuid.uuid4().hex[:4]}.mp4")

    video = None
    voice_clip = None
    final_audio = None

    try:
        video = VideoFileClip(video_path)
        audio_tracks = []

        if video.audio:
            # نخفض صوت فيديو Veo لكي لا يطغى على صوت المعلق
            veo_audio = video.audio.with_volume_scaled(0.6)
            audio_tracks.append(veo_audio)

        # 1. معالجة التعليق الصوتي (Voiceover)
        if voice_path and os.path.exists(voice_path):
            voice_clip = AudioFileClip(voice_path)
            # رفع مستوى الصوت ليكون المعلق هو الأوضح
            voice_clip = voice_clip.with_volume_scaled(1.2) 
            
            ###  تسريع الصوت
            # if voice_clip.duration > video.duration:
            #     speed_factor = voice_clip.duration / (video.duration - 0.1)
            #     print(f"⚠️ Voiceover is longer than video. Speeding up by {speed_factor:.2f}x to fit...")
            #     voice_clip = voice_clip.time_transform(lambda t: t * speed_factor)
            #     voice_clip = voice_clip.with_duration(video.duration - 0.1)

            ### تكرار الفيديو
            if voice_clip.duration > video.duration:
                print(f"⚠️ Voiceover ({voice_clip.duration:.1f}s) is longer than video ({video.duration:.1f}s). Extending video to fit...")
                
                # حساب كم مرة نحتاج تكرار الفيديو ليغطي الصوت
                repeats = math.ceil(voice_clip.duration / video.duration)
                
                # تكرار الفيديو
                video = concatenate_videoclips([video] * repeats)
                
                # قص الفيديو المكرر ليطابق طول الصوت بالملي ثانية
                video = video.with_duration(voice_clip.duration)
                
                # تحديث مسار الموسيقى القديمة لكي تتكرر أيضاً مع الفيديو
                if video.audio:
                    veo_audio = video.audio.with_volume_scaled(0.6)
                    audio_tracks[0] = veo_audio # تحديث مسار الموسيقى

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
            print(f"✅ Final video with audio saved: {output_path}")
            return output_path
        
        return video_path

    except Exception as e:
        print(f"❌ Audio Merge Failed: {e}")
        return video_path 
        
    finally:
        # 🧹 تنظيف الذاكرة (Memory Leak Prevention)
        if video: video.close()
        if voice_clip: voice_clip.close()
        if final_audio: final_audio.close()
        
        # حذف الملفات الصوتية المؤقتة لتوفير المساحة
        try:
            if voice_path and os.path.exists(voice_path): os.remove(voice_path)
        except: pass