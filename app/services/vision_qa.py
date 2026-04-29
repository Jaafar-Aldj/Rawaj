import os
import time
import json
import re
import google.generativeai as genai
import PIL.Image
from ..config import settings
    
from app.logger import get_logger
logger = get_logger(__name__)

# إعداد Gemini
if settings.google_api_key:
    genai.configure(api_key=settings.google_api_key)

def extract_json_from_text(text):
    """دالة مساعدة لاستخراج JSON من رد المخرج الفني"""
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except json.JSONDecodeError as e:
        logger.error(f"Art Director JSON parse failed. Error: {e}. Text snippet: {text[:200]!r}")
    except Exception as e:
        logger.exception(f"Unexpected error in extract_json_from_text: {e}")
    return None

def analyze_media(file_path, prompt, user_feedback=None, media_type="image", reference_image_path=None):
    """
    وظيفة Art Director المحدثة: 
    يقيم الميديا ويرجع استجابة بصيغة JSON تحتوي على الحالة، السبب، والبرومبت المعدل (إذا لزم الأمر).
    """
    if not file_path or not os.path.exists(file_path):
        logger.warning(f"analyze_media: File not found or path is None. path='{file_path}' | type={media_type}")
        return {"status": "ERROR", "feedback": "Media file not found.", "improved_prompt": prompt}

    video_file = None # مرجع لملف الفيديو من أجل الحذف لاحقاً
    
    
    try:
        # استخدام موديل الفلاش لأنه سريع وممتاز للرؤية
        model = genai.GenerativeModel('gemini-2.5-flash')
        contents = []

        if reference_image_path and os.path.exists(reference_image_path):
            logger.debug(f"Using reference image for comparison: {reference_image_path}")
            ref_media = PIL.Image.open(reference_image_path)
            contents.append("This is the ORIGINAL product image (The Ground Truth). The product in the generated media MUST look exactly like this in shape, color, and branding:")
            contents.append(ref_media)  

        contents.append(f"\nThis is the GENERATED {media_type} to be reviewed based on the prompt: '{prompt}'")

        # 1. تجهيز الميديا (صورة أو فيديو)
        if media_type == "image":
            media = PIL.Image.open(file_path)
            contents.append(media)
            
        elif media_type == "video":
            logger.info(f"Uploading video to Gemini for QA: {file_path}")
            video_file = genai.upload_file(path=file_path)
            
            logger.info("Waiting for video processing on Google servers...")
            while video_file.state.name == "PROCESSING":
                time.sleep(3)
                video_file = genai.get_file(video_file.name)
            logger.info("Video is ready for QA review.") 
            if video_file.state.name == "FAILED":
                logger.error(f"Google failed to process video: {file_path}. State: {video_file.state.name}")
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
        logger.info(f"Art Director reviewing {media_type} | feedback_mode={bool(user_feedback)}")
        response = model.generate_content(contents)
        
        # 5. استخراج الـ JSON
        result_json = extract_json_from_text(response.text)
        
        if result_json and "status" in result_json:
            logger.info(f"Art Director decision: {result_json['status']} | Feedback: {result_json.get('feedback', '')[:120]}")
            return result_json
        else:
            logger.warning(
                f"Art Director returned unparseable JSON for {media_type}. "
                f"Auto-approving. Raw response snippet: {response.text[:200]!r}"
            )
            return {"status": "APPROVED", "feedback": "Auto-approved due to parsing error.", "improved_prompt": prompt}

    except PIL.Image.UnidentifiedImageError as e:
        logger.error(f"Cannot open image file (corrupt or unsupported format): {file_path}. Error: {e}")
        return {"status": "APPROVED", "feedback": "Auto-approved: image file is unreadable.", "improved_prompt": prompt}

    except Exception as e:
        logger.exception(f"Art Director vision failed for {media_type} '{file_path}': {e}")
        return {"status": "APPROVED", "feedback": "Auto-approved due to API error.", "improved_prompt": prompt}
        
    finally:
        # 🧹 تنظيف خوادم جوجل دائماً حتى لو حدث خطأ (مهم جداً!)
        if media_type == "video" and video_file:
            try:
                genai.delete_file(video_file.name)
                logger.debug(f"Cleaned up video from Google servers: {video_file.name}")
            except Exception as e:
                logger.warning(f"Failed to delete video from Google servers '{video_file.name}': {e}")