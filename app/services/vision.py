import os
from google import genai
from PIL import Image
from ..config import settings


from app.logger import get_logger
logger = get_logger(__name__)

# إعداد العميل باستخدام المكتبة الجديدة
client = genai.Client(api_key=settings.google_api_key)

def analyze_image_content(image_url):
    """
    تحليل الصورة المخزنة محلياً باستخدام google.genai و Gemini 2.0 Flash
    """
    if not image_url:
        logger.error("Invalid image URL provided.")
        return None
    
    try:
        # 1. تحديد المسار المحلي للصورة
        local_path = image_url
        if "upload/" in image_url:
            filename = image_url.split("upload/")[-1]
            local_path = os.path.join("rawaj-frontend", "assets", "upload", filename)
            
        if not os.path.exists(local_path):
            logger.warning(f"Image file not found for analysis: {local_path}")
            return None

        logger.info(f"Analyzing Product Image: {local_path}...")
        
        # 2. فتح الصورة
        img = Image.open(local_path)
        
        # 3. إعداد الطلب
        prompt = """
        Describe this product image in high detail for a marketing team. 
        Focus on: Colors, Material, Design Style, and Key Features.
        Be objective.
        Output a concise paragraph.
        """
        
        # 4. الإرسال باستخدام المكتبة الجديدة (generate_content)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, img]
        )
        
        # 5. استخراج النص
        if response.text:
            logger.info(f"Visual Analysis Result: {response.text}")
            return f"\n[AI Visual Analysis of the Product Image]: {response.text}"
        else:
            logger.warning("No text generated from image analysis.")
            return ""

    except Exception as e:
        logger.error(f"Vision Analysis Failed: {e}")
        return ""