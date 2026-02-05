import os
from ..config import settings
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel, Image as VertexImage
from google.oauth2 import service_account
from PIL import Image

API_KEY = settings.google_api_key

IMAGE_DIR = "rawaj-frontend/assets/image"
os.makedirs(IMAGE_DIR, exist_ok=True)

# إعدادات المصادقة (نفس طريقة الفيديو)
current_dir = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_FILE = os.path.join(current_dir, "../../service_account.json")
PROJECT_ID = settings.project_id
LOCATION = "us-central1" # أو منطقتك المفعلة

def get_credentials():
    return service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)


def create_mask_from_image(image_path):
    """
    استخراج القناع من صورة PNG شفافة.
    المنطقة الشفافة ستصبح بيضاء (للتعديل).
    المنطقة الملونة (المنتج) ستصبح سوداء (للحماية).
    """
    img_pil = Image.open(image_path).convert("RGBA")
    
    # استخراج قناة الشفافية (Alpha)
    alpha = img_pil.split()[-1]
    
    # إنشاء القناع:
    # Alpha = 0 (شفاف) -> 255 (أبيض - سيتم استبداله بالخلفية الجديدة)
    # Alpha > 0 (المنتج) -> 0 (أسود - لن يلمسه الذكاء الاصطناعي)
    mask = Image.eval(alpha, lambda x: 255 if x == 0 else 0)
    
    return mask

def generate_image_with_imagen(prompt, reference_image_path=None):
    """
    توليد صورة باستخدام Google Vertex AI (Imagen 2/3).
    يدعم Text-to-Image و Image Editing (Inpainting).
    """
    try:
        # تهيئة Vertex AI
        creds = get_credentials()
        vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=creds)
        
        # تحميل الموديل (Imagen 2 هو الأكثر استقراراً للتعديل حالياً)
        model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001") 
        
        filename = f"img_{os.urandom(4).hex()}.png"
        output_path = os.path.join(IMAGE_DIR, filename)

        if reference_image_path and os.path.exists(reference_image_path):
            print(f"🖼️ Using Product Image for Editing: {reference_image_path}")
            
            # 1. تحميل الصورة الأصلية
            base_img = VertexImage.load_from_file(reference_image_path)
            
            # 2. إنشاء القناع (Mask)
            pil_mask = create_mask_from_image(reference_image_path)
            
            # حفظ القناع مؤقتاً لتحويله لـ VertexImage (اختياري، يمكن التحويل بالذاكرة)
            mask_path = "temp_mask.png"
            pil_mask.save(mask_path)
            mask_img = VertexImage.load_from_file(mask_path)
            
            # 3. إرسال طلب التعديل (Edit/Inpaint)
            print(f"🎨 Editing background with prompt: {prompt}")
            images = model.edit_image(
                base_image=base_img,
                mask=mask_img,
                prompt=prompt,
                guidance_scale=60, # الالتزام بالوصف
                # product_mode=True # (ميزة تجريبية في بعض الموديلات، يمكن تجربتها)
            )
            
            # تنظيف
            if os.path.exists(mask_path): os.remove(mask_path)

        else:
            # توليد عادي من النص (إذا لم تكن هناك صورة)
            print(f"🎨 Generating new image from text: {prompt}")
            images = model.generate_images(
                prompt=prompt,
                number_of_images=1,
                aspect_ratio="16:9"
            )

        # حفظ الصورة الناتجة
        if images:
            images[0].save(location=output_path, include_generation_parameters=False)
            print(f"✅ Image saved at: {output_path}")
            return output_path
        
    except Exception as e:
        print(f"❌ Vertex AI Error: {e}")
        return None



# للتجربة
if __name__ == "__main__":
    # ضع مسار صورة حقيقية عندك للتجربة
    test_img = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\upload\test_product.jpg" 
    prompt = "Professional product photography, placing the product on a wooden table in a sunny garden, bokeh background."
    generate_image_with_imagen(prompt, test_img)

