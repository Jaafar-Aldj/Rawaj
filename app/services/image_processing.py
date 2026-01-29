from rembg import remove
from PIL import Image
import os

def remove_background(input_path, output_path=None):
    """
    تقوم بقص المنتج من الصورة وإزالة الخلفية.
    """
    try:
        print(f"✂️ Removing background from: {input_path}")
        
        # فتح الصورة
        input_image = Image.open(input_path)
        
        # عملية القص (السحر هنا)
        output_image = remove(input_image)
        
        # تحديد مسار الحفظ
        if not output_path:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_no_bg.png" # نحفظها بصيغة PNG للشفافية
        
        # الحفظ
        output_image.save(output_path)
        print(f"✅ Background removed. Saved at: {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Background Removal Failed: {e}")
        return None
    
if __name__ == "__main__":
    image_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\smart_fitness_tracker.jpeg"
    remove_background(input_path=image_path)
