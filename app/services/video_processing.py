from moviepy import VideoFileClip, concatenate_videoclips
import os

def concatenate_veo_videos(video_paths, output_path=None):
    """دمج عدة مقاطع فيديو في فيديو واحد طويل"""
    try:
        print(f"🎬 Concatenating {len(video_paths)} video clips...")
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
        
        print(f"✅ Final long video saved at: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ Video Concatenation Failed: {e}")
        return video_paths[0] if video_paths else None