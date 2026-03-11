# import os
# from elevenlabs.client import ElevenLabs
# from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip
# # تأكد من أن ملف الإعدادات يحتوي على مفتاح ElevenLabs الصالح
# from ..config import settings 

# # إعداد العميل (تأكد أن المفتاح هنا صالح وجديد)
# client = ElevenLabs(api_key=settings.elevenlabs_api_key) 

# def generate_voiceover(text: str, output_path="voice.mp3"):
#     """توليد تعليق صوتي (Speech)"""
#     print(f"🗣️ Generating Voiceover: {text[:30]}...")
#     try:
#         # ✅ التصحيح: استخدام convert بدلاً من generate
#         audio_stream = client.text_to_speech.convert(
#             text=text,
#             voice_id="JBFqnCBsd6RMkjVDRZzb", # هذا ID لصوت 'Rachel'
#             model_id="eleven_multilingual_v2",
#             output_format="mp3_44100_128"
#         )
        
#         # حفظ الملف (لأن النتيجة تأتي كتدفق بيانات Stream)
#         with open(output_path, "wb") as f:
#             for chunk in audio_stream:
#                 if chunk:
#                     f.write(chunk)
        
#         print(f"✅ Voiceover saved: {output_path}")
#         return output_path

#     except Exception as e:
#         print(f"❌ Voiceover failed: {e}")
#         return None

# def generate_sfx(prompt: str, duration_seconds=5, output_path="sfx.mp3"):
#     """توليد مؤثرات صوتية (Sound Effects)"""
#     print(f"🔊 Generating SFX: {prompt}...")
#     try:
#         # ✅ هذه الميزة تتطلب حساباً فيه رصيد كافٍ
#         result = client.text_to_sound_effects.convert(
#             text=prompt,
#             duration_seconds=duration_seconds, 
#             prompt_influence=0.5
#         )
        
#         with open(output_path, "wb") as f:
#             for chunk in result:
#                 if chunk:
#                     f.write(chunk)
                
#         print(f"✅ SFX saved: {output_path}")
#         return output_path

#     except Exception as e:
#         print(f"❌ SFX failed: {e}")
#         return None

# def merge_video_audio(video_path, voice_path=None, sfx_path=None, output_path="final_output.mp4"):
#     """دمج الفيديو مع الأصوات"""
#     print("🎬 Merging Audio & Video...")
    
#     if not os.path.exists(video_path):
#         print(f"❌ Video path not found: {video_path}")
#         return None

#     try:
#         video = VideoFileClip(video_path)
#         audio_tracks = []

#         # 1. إضافة التعليق الصوتي
#         if voice_path and os.path.exists(voice_path):
#             voice_clip = AudioFileClip(voice_path)
#             # رفع صوت المعلق ليكون واضحاً
#             voice_clip = voice_clip.with_volume_scaled(1.8) 
            
#             # إذا كان الصوت أطول من الفيديو، نمدد الفيديو (Loop)
#             if voice_clip.duration > video.duration:
#                 print("ℹ️ Audio is longer than video. Looping video.")
#                 video = video.loop(duration=voice_clip.duration)
                
#             audio_tracks.append(voice_clip)

#         # 2. إضافة المؤثرات الصوتية (اختياري)
#         if sfx_path and os.path.exists(sfx_path):
#             sfx_clip = AudioFileClip(sfx_path)
#             # تكرار المؤثرات لتغطي كامل الفيديو
#             if sfx_clip.duration < video.duration:
#                 sfx_clip = sfx_clip.loop(duration=video.duration)
#             else:
#                 sfx_clip = sfx_clip.subclipped(0, video.duration)
            
#             # خفض صوت المؤثرات لتكون خلفية فقط
#             sfx_clip = sfx_clip.with_volume_scaled(0.3) 
#             audio_tracks.append(sfx_clip)

#         if audio_tracks:
#             # دمج المسارات الصوتية
#             final_audio = CompositeAudioClip(audio_tracks)
#             # التأكد من أن الصوت بنفس طول الفيديو النهائي
#             final_audio = final_audio.subclipped(0, video.duration)
            
#             final_video = video.with_audio(final_audio)
            
#             # تصدير الفيديو النهائي
#             final_video.write_videofile(output_path, codec="libx264", audio_codec="aac")
#             print(f"✅ Final video saved successfully at: {output_path}")
#             return output_path
#         else:
#             print("⚠️ No audio tracks found to merge.")
#             return None

#     except Exception as e:
#         print(f"❌ Merge failed: {e}")
#         return None

# # --- تجربة النظام ---
# if __name__ == "__main__":
#     # 1. حدد مسار الفيديو الذي استعدته من Veo
#     video_file = r"final_video.mp4"  # تأكد أن هذا الملف موجود بجانب الكود
    
#     # 2. النص المراد تحويله لصوت
#     text_prompt = "Experience the ultimate performance with our new smart tracker."
    
#     # 3. وصف المؤثرات الصوتية
#     sfx_prompt = "Cinematic futuristic whoosh and high tech ambiance"

#     # تشغيل العمليات
#     if os.path.exists(video_file):
#         voice = generate_voiceover(text_prompt)
#         sfx = generate_sfx(sfx_prompt, duration_seconds=5) # مدة قصيرة للتجربة
        
#         # الدمج
#         if voice:
#             merge_video_audio(video_file, voice, sfx)
#     else:
#         print("❌ Please put a video file named 'final_video.mp4' to test.")