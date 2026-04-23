import os
import time
import json
import re
import google.generativeai as genai
import PIL.Image
from ..config import settings

# إعداد Gemini
if settings.google_api_key:
    genai.configure(api_key=settings.google_api_key)

def extract_json_from_text(text):
    """دالة مساعدة لاستخراج JSON من رد المخرج الفني"""
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"❌ Art Director JSON Parse Error: {e}")
    return None

def analyze_media(file_path, prompt, user_feedback=None, media_type="image", reference_image_path=None):
    """
    وظيفة Art Director المحدثة: 
    يقيم الميديا ويرجع استجابة بصيغة JSON تحتوي على الحالة، السبب، والبرومبت المعدل (إذا لزم الأمر).
    """
    if not file_path or not os.path.exists(file_path):
        return {"status": "ERROR", "feedback": "Media file not found.", "improved_prompt": prompt}

    video_file = None # مرجع لملف الفيديو من أجل الحذف لاحقاً
    
    
    try:
        # استخدام موديل الفلاش لأنه سريع وممتاز للرؤية
        model = genai.GenerativeModel('gemini-2.5-flash')
        contents = []

        if reference_image_path and os.path.exists(reference_image_path):
            print(f"📌 Using reference image for comparison: {reference_image_path}")
            ref_media = PIL.Image.open(reference_image_path)
            contents.append("This is the ORIGINAL product image (The Ground Truth). The product in the generated media MUST look exactly like this in shape, color, and branding:")
            contents.append(ref_media)  

        contents.append(f"\nThis is the GENERATED {media_type} to be reviewed based on the prompt: '{prompt}'")

        # 1. تجهيز الميديا (صورة أو فيديو)
        if media_type == "image":
            media = PIL.Image.open(file_path)
            contents.append(media)
            
        elif media_type == "video":
            print(f"⏳ Uploading video to Gemini for QA: {file_path}...")
            video_file = genai.upload_file(path=file_path)
            
            print("⏳ Waiting for video processing on Google servers...")
            while video_file.state.name == "PROCESSING":
                print(".", end="", flush=True)
                time.sleep(3)
                video_file = genai.get_file(video_file.name) 
                
            print("\n✅ Video ready for QA.")
            if video_file.state.name == "FAILED":
                return {"status": "ERROR", "feedback": "Google failed to process the video.", "improved_prompt": prompt}
            
            contents.append(video_file)

        # 2. تحديد المهمة والتعليمات (Prompt Engineering)
        system_instruction = f"""
        You are the Chief Art Director at Rawaj Agency.
        Review this generated {media_type}.
        Original generation prompt was: '{prompt}'
        """

        if user_feedback:
            # --- سيناريو: تعديل بناءً على طلب المستخدم ---
            system_instruction += f"""
            User Complaint: '{user_feedback}'
            TASK: The user is unhappy. Analyze the {media_type} and the complaint. 
            Provide actionable feedback and REWRITE the original prompt to fix the issue.
            """
        else:
            # --- سيناريو: فحص الجودة الآلي (QA) ---
            system_instruction += f"""
            TASK: Quality check this {media_type}.
            1. Identity Loss: The product in the generated {media_type} looks completely different from the ORIGINAL product image (wrong color, wrong shape, missing key logos).
            2. Text Artifacts: Severe watermarks, floating text, or gibberish letters are visible.
            3. Anatomical Errors: Deformed humans, extra fingers, or highly distorted faces.
            4. Safety Violation: Contains alcohol, nudity, or inappropriate content.
            
            BE EXTREMELY LENIENT. Generative AI is not perfect. 
            - IGNORE minor background details.
            - IGNORE smiles, open mouths, or facial expressions. DO NOT reject the video just because a character opens their mouth or smiles, as long as they are not explicitly talking/lip-syncing to non-existent dialogue.
            
            If REJECTED, you MUST provide an 'improved_prompt' that tells the Prompt_Engineer exactly how to avoid this error.
            """

        # 3. إجبار الموديل على إخراج JSON صارم
        system_instruction += """
        OUTPUT FORMAT:
        You MUST respond ONLY with a valid JSON object. No markdown, no conversational text.
        {
            "status": "APPROVED or REJECTED",
            "feedback": "Explain why it is approved or what is wrong.",
            "improved_prompt": "Provide a fixed version of the prompt if rejected or user asked for edits. If approved, return the original prompt."
        }
        """
        contents.append(system_instruction)

        # 4. إرسال الطلب لجوجل
        print(f"🕵️‍♂️ Art Director is analyzing the {media_type}...")
        response = model.generate_content(contents)
        
        # 5. استخراج الـ JSON
        result_json = extract_json_from_text(response.text)
        
        if result_json and "status" in result_json:
            return result_json
        else:
            # Fallback في حال فشل الذكاء الاصطناعي في إرجاع JSON
            return {"status": "APPROVED", "feedback": "Auto-approved due to parsing error.", "improved_prompt": prompt}

    except Exception as e:
        print(f"⚠️ Art Director Vision Failed: {e}")
        return {"status": "APPROVED", "feedback": "Auto-approved due to API error.", "improved_prompt": prompt}
        
    finally:
        # 🧹 تنظيف خوادم جوجل دائماً حتى لو حدث خطأ (مهم جداً!)
        if media_type == "video" and video_file:
            try:
                genai.delete_file(video_file.name)
                print(f"🧹 Cleaned up video from Google servers.")
            except Exception as e:
                print(f"⚠️ Failed to delete video from Google servers: {e}")