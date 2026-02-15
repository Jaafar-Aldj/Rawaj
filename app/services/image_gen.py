import os
from google import genai
from google.genai import types
from PIL import Image
from ..config import settings

# إعداد العميل باستخدام المفتاح الموجود في .env
client = genai.Client(api_key=settings.google_api_key)

IMAGE_DIR = "rawaj-frontend/assets/image"
os.makedirs(IMAGE_DIR, exist_ok=True)

def generate_image_with_imagen(prompt, reference_image_path=None):
    """
    توليد صورة باستخدام Gemini 2.0 Flash / Imagen 3
    يدعم الإدخال (نص + صورة) لتوجيه التوليد.
    """
    try:
        filename = f"gen_{os.urandom(4).hex()}.png"
        output_path = os.path.join(IMAGE_DIR, filename)
        
        # 1. تحديد الموديل
        # حسب التوثيق: gemini-2.5-flash-image أو gemini-2.0-flash-exp
        # سنجرب الموديل المتاح حالياً الذي يدعم توليد الصور
        model_id = "gemini-2.5-flash-image" 

        # 2. تجهيز المدخلات (Contents)
        contents = [prompt]
        
        # إذا وجدنا صورة منتج، نضيفها للمدخلات
        if reference_image_path and os.path.exists(reference_image_path):
            print(f"🖼️ Using Reference Image: {reference_image_path}")
            
            # فتح الصورة بـ PIL
            ref_img = Image.open(reference_image_path)
            
            # نضيف الصورة للقائمة
            contents.append(ref_img)
            
            # تعديل البرومبت ليطلب الحفاظ على المنتج
            contents[0] = f"Generate a high-quality product marketing image based on this object. {prompt}. Make sure the product looks exactly like the provided image. High resolution, photorealistic."
        else:
            print(f"🎨 Generating from Text only: {prompt}")

        # 3. إعدادات التوليد (لطلب صورة وليس نص)
        # ملاحظة هامة: مع Gemini، لكي يولد صورة، يجب أن نطلب منه ذلك في الكونفيج أو البرومبت
        # الكود الذي أرسلته أنت يستخدم generate_content ويعيد parts.inline_data
        
        print(f"🚀 Sending request to {model_id}...")
        
        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"] # إجبار الموديل على إرجاع صورة
            )
        )

        # 4. استخراج الصورة وحفظها
        for part in response.parts:
            if part.inline_data:
                # تحويل البيانات إلى صورة وحفظها
                img = part.as_image()
                img.save(output_path)
                print(f"✅ Image Generated & Saved: {output_path}")
                return output_path
                
        print("⚠️ No image found in response.")
        return None

    except Exception as e:
        print(f"❌ GenAI Error: {e}")
        # إذا فشل الموديل الجديد، يمكننا وضع كود احتياطي هنا (اختياري)
        return None

# تجربة مباشرة
if __name__ == "__main__":
    test_prompt = "A group of diverse children, aged 6-12, playfully interacting on a meticulously designed pirate ship playground structure. Some children are pretending to steer, while others are charting courses with oversized maps, all wearing the navy captain hats. Bright, sunny afternoon lighting, low-angle shot to emphasize the scale of the playground and the children's imaginative adventure, vibrant colors, reminiscent of a Wes Anderson film. --no alcohol, women"
    # ضع مسار صورة عندك للتجربة
    test_ref = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\upload\74d1e8b3-591e-41bc-b1c3-be8a3434d020_no_bg.png"
    generate_image_with_imagen(test_prompt, test_ref)