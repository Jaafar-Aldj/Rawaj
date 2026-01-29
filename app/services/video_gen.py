from moviepy import ImageClip, AudioFileClip, CompositeVideoClip
import os

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
    

if __name__ == "__main__" :
     image_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\smart_fitness_tracker.jpeg"
     audio_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\MA_Designed_ReconFastBlaster_3.mp3"
     create_video_from_image_and_audio(image_path=image_path, audio_path=audio_path)