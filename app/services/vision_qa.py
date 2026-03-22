import os
import google.generativeai as genai
import PIL.Image
import time
from ..config import settings

# إعداد Gemini
if settings.google_api_key:
    genai.configure(api_key=settings.google_api_key)

def analyze_media(file_path, prompt, user_feedback=None, media_type="image"):
    """
    وظيفة Art Director: يرى الصورة أو الفيديو، ويقيمها أو يستخرج تعليمات بناءً على ملاحظات المستخدم.
    """
    if not file_path or not os.path.exists(file_path):
        return "ERROR: Media file not found."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        contents = []

        # 1. تجهيز الميديا (صورة أو فيديو)
        if media_type == "image":
            media = PIL.Image.open(file_path)
            contents.append(media)
        elif media_type == "video":
            # Gemini يدعم رفع الفيديو مباشرة (يجب رفعه أولاً عبر File API)
            print(f"⏳ Uploading video to Gemini for analysis: {file_path}...")
            video_file = genai.upload_file(path=file_path)
            print("⏳ Waiting for video processing on Google servers...")
            while video_file.state.name == "PROCESSING":
                print(".", end="", flush=True)
                time.sleep(3)
                video_file = genai.get_file(video_file.name) # تحديث حالة الملف
            print("\n✅ Video ready for analysis.")
            
            if video_file.state.name == "FAILED":
                return "ERROR: Google failed to process the video."
            contents.append(video_file)

        # 2. تحديد المهمة (QA أو Feedback Analysis)
        if user_feedback:
            if media_type == "video":
                system_instruction = f"You are the Chief Art Director. Look at this generated {media_type}.\n\nOriginal Storyboard used to generate it: '{prompt}'"
            else:
                system_instruction = f"You are the Chief Art Director. Look at this generated {media_type}.\n\nOriginal Image Prompt used to generate it: '{prompt}'"
            # سيناريو التعديل (User Feedback Loop)
            system_instruction += f"""
            
            User Complaint/Feedback: '{user_feedback}'
            
            TASK: The user is not happy. Based on what you see in the {media_type} and the user's feedback, write clear, actionable, technical instructions for the 'Prompt_Engineer' on how to rewrite the prompt to fix these issues. 
            DO NOT generate the new prompt yourself, just write the instructions.
            """
            
        else:
            if media_type == "video":
                system_instruction = f"You are the Chief Art Director. Quality check this generated {media_type} based on this storyboard: '{prompt}'."
            else:
                system_instruction = f"You are the Chief Art Director. Quality check this generated {media_type} based on this image prompt: '{prompt}'."
            # سيناريو الجودة (Automated QA)
            system_instruction += f"""
            
            CRITICAL CHECKS:
            1. Are there ANY weird text, typos, or watermarks? (MUST be text-free unless requested).
            2. Are there deformed faces, extra fingers, or distorted objects?
            3. Does it clearly violate the prompt?
            
            If PERFECT: Output exactly: APPROVED
            If FAILED: Output exactly: REJECTED | [Explain technically what went wrong so the Prompt_Engineer can fix it].
            """

        contents.append(system_instruction)

        # 3. إرسال الطلب
        print(f"🕵️‍♂️ Art Director is analyzing the {media_type}...")
        response = model.generate_content(contents)
        result_text = response.text.strip()
        
        # تنظيف ملف الفيديو من سيرفرات جوجل (مهم جداً لعدم امتلاء المساحة)
        if media_type == "video":
            try: genai.delete_file(video_file.name)
            except: pass

        return result_text

    except Exception as e:
        print(f"⚠️ Art Director Vision Failed: {e}")
        return "APPROVED" if not user_feedback else f"Apply user feedback: {user_feedback}"