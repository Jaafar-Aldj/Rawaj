import google.generativeai as genai
import PIL.Image
import os
from app.agents.config import api_key

# إعداد Gemini
genai.configure(api_key=api_key)

def analyze_image_content(image_url):
    """
    تحليل الصورة المخزنة محلياً بناءً على الرابط العام
    """
    if not image_url:
        return None
    try:
        if "upload/" in image_url:
            filename = image_url.split("upload/")[-1]
            local_path = os.path.join("rawaj-frontend", "assets", "upload", filename)
        else:
            local_path = image_url # افتراض أنه مسار محلي
            
        if not os.path.exists(local_path):
            print(f"⚠️ Image file not found: {local_path}")
            return None

        print(f"👁️ Analyzing Product Image: {local_path}...")
        model = genai.GenerativeModel('gemini-2.0-flash') # سريع ورخيص
        img = PIL.Image.open(local_path)
        
        prompt = """
        Describe this product image in high detail for a marketing team. 
        Focus on: Colors, Material, Design Style, and Key Features.
        Be objective.
        Output a concise paragraph.
        """
        
        response = model.generate_content([prompt, img])
        return f"\n[AI Visual Analysis of the Product Image]: {response.text}"

    except Exception as e:
        print(f"❌ Vision Analysis Failed: {e}")
        return None