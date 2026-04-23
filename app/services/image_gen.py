import os
import glob
import time
from io import BytesIO
from google import genai
from google.genai import types
from PIL import Image
from app.config import settings

client = genai.Client(api_key=settings.google_api_key)

IMAGE_DIR = "rawaj-frontend/assets/image"
os.makedirs(IMAGE_DIR, exist_ok=True)

# الموديل الداعم للبصمة
IMAGE_MODEL = "gemini-2.5-flash-image"

def generate_image(prompt, reference_image_path=None, aspect_ratio="16:9", thought_signature=None):
    """
    توليد وتعديل الصور بدعم (Thought Signature) للتطابق التام.
    """
    if settings.use_mock_api:
        print(f"💰 [SAVED $] MOCKING IMAGEN GENERATION...")
        time.sleep(2)
        existing_images = glob.glob(os.path.join(IMAGE_DIR, "gen_*.png"))
        if existing_images:
            return existing_images[0], "mock_thought_signature_777"
        return None, None

    try:
        filename = f"gen_{os.urandom(4).hex()}.png"
        output_path = os.path.join(IMAGE_DIR, filename)

        contents =[]

        # ---------------------------------------------------------
        # 🔄 وضع التعديل (Edit Mode): يوجد بصمة + صورة قديمة
        # ---------------------------------------------------------
        if thought_signature and reference_image_path and os.path.exists(reference_image_path):
            print(f"🧠 Injecting Thought Signature for 100% Match Editing...")
            
            with open(reference_image_path, "rb") as f:
                prev_image_bytes = f.read()

            prev_model_part = types.Part(
                inline_data=types.Blob(mime_type="image/png", data=prev_image_bytes),
                thought_signature=thought_signature
            )
            contents.append(types.Content(role="model", parts=[prev_model_part]))
            
            user_parts = [types.Part(text=f"{prompt} . exclude women, exclude females, exclude alcohol")]
            contents.append(types.Content(role="user", parts=user_parts))

        # ---------------------------------------------------------
        # 🆕 وضع التوليد الأول (New Generation)
        # ---------------------------------------------------------
        else:
            final_prompt = f"{prompt} . exclude women, exclude females, exclude alcohol"
            user_parts = [types.Part(text=final_prompt)]
            
            if reference_image_path and os.path.exists(reference_image_path):
                print(f"🖼️ Using Base Product Image: {reference_image_path}")
                ref_img = Image.open(reference_image_path)
                
                # معالجة الشفافية لتجنب أخطاء السيرفر
                if ref_img.mode in ('RGBA', 'LA') or (ref_img.mode == 'P' and 'transparency' in ref_img.info):
                    bg = Image.new('RGB', ref_img.size, (255, 255, 255))
                    bg.paste(ref_img, mask=ref_img.split()[3])
                    ref_img = bg
                elif ref_img.mode != 'RGB':
                    ref_img = ref_img.convert('RGB')
                    
                ref_img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                
                # 👈 التعديل الحاسم: تغليف الصورة كبايتات صحيحة للـ API
                img_byte_arr = BytesIO()
                ref_img.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                
                user_parts.append(types.Part(
                    inline_data=types.Blob(mime_type="image/png", data=img_bytes)
                ))
                
                user_parts[0] = types.Part(text=f"Generate a high-quality scene based on this object. {prompt}. CRITICAL: Do NOT alter the shape or color of the provided product image.")

            contents.append(types.Content(role="user", parts=user_parts))

        print(f"🚀 Sending request to {IMAGE_MODEL}...")

        # 3. استدعاء API جوجل
        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
                response_modalities=['TEXT', 'IMAGE'] 
            )
        )

        returned_signature = None

        # 4. استخراج الصورة وبصمة التفكير
        for part in response.parts:
            if hasattr(part, 'thought_signature') and part.thought_signature:
                returned_signature = part.thought_signature
                print("✅ Captured Thought Signature!")
                
            if part.inline_data:
                img = part.as_image()
                img.save(output_path)
                print(f"✅ Image Generated & Saved: {output_path}")
                return output_path, returned_signature
                
        print("⚠️ No image found in response.")
        return None, None

    except Exception as e:
        print(f"❌ GenAI Error: {e}")
        return None, None


    
if __name__ == "__main__":
    # مثال تجريبي
    prompt = "Create a vibrant outdoor scene with the product prominently displayed. The product should be the focal point, with a lively background that complements its colors and style."
    reference_image = r"rawaj-frontend/assets/upload/51e34f71-9932-4035-b41a-76224cec044f_no_bg.png"  # ضع مسار صورة المنتج هنا
    output_path, signature = generate_image(prompt, reference_image_path=reference_image, aspect_ratio="16:9")
    print(f"Generated Image Path: {output_path}")
    print(f"Returned Thought Signature: {signature}")