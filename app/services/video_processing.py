from moviepy import AudioFileClip, VideoFileClip, concatenate_videoclips
import os

from app.logger import get_logger
logger = get_logger(__name__)

def concatenate_veo_videos(video_paths, output_path=None):
    """دمج عدة مقاطع فيديو في فيديو واحد طويل"""
    try:
        logger.info(f"Concatenating {len(video_paths)} video clips...")
        clips = []
        for path in video_paths:
            if path and os.path.exists(path):
                clips.append(VideoFileClip(path))
        
        if not clips: return None

        final_video = concatenate_videoclips(clips, method="compose")
        
        if not output_path:
            # تأكد من استيراد VIDEO_DIR أو كتابة المسار
            output_path = os.path.join("rawaj-frontend/assets/video", f"final_campaign_{os.urandom(4).hex()}.mp4")
            
        final_video.write_videofile(output_path, codec="libx264", audio_codec="aac")
        
        for clip in clips: clip.close()
        final_video.close()
        
        logger.info(f"Final long video saved at: {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Video Concatenation Failed: {e}")
        return video_paths[0] if video_paths else None
    
def merge_video_with_audio(video_path, audio_path):
    """دمج فيديو Veo المتحرك مع صوت ElevenLabs"""
    try:
        logger.info("Merging video with audio...")
        video_clip = VideoFileClip(video_path)
        audio_clip = AudioFileClip(audio_path)
        
        if audio_clip.duration > video_clip.duration:
             video_clip = video_clip.loop(duration=audio_clip.duration)
        
        final_clip = video_clip.with_audio(audio_clip)
        
        output_path = video_path.replace(".mp4", "_audio.mp4")
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")

        video_clip.close()
        audio_clip.close()
        final_clip.close()
        
        return output_path
    except Exception as e:
        logger.error(f"Merge Failed: {e}")
        return video_path 