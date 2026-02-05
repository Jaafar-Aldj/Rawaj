from rembg import remove
from PIL import Image
import os

def remove_background(input_path):
    """
    تقوم بقص المنتج من الصورة وإزالة الخلفية.
    """
    if "upload/" in input_path:
        filename = input_path.split("upload/")[-1]
        local_path = os.path.join("rawaj-frontend", "assets", "upload", filename)
    else:
        local_path = input_path
    try:
        print(f"✂️ Removing background from: {local_path}")
        
        # فتح الصورة
        input_image = Image.open(local_path)
        
        # عملية القص (السحر هنا)
        output_image = remove(input_image)
        
        base, ext = os.path.splitext(local_path)
        output_path = f"{base}_no_bg.png" # نحفظها بصيغة PNG للشفافية
        
        # الحفظ
        output_image.save(output_path)
        print(f"✅ Background removed. Saved at: {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Background Removal Failed: {e}")
        return None
    
if __name__ == "__main__":
    image_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\df01cd27-6979-48e9-bf19-4f04f626a768.jpg"
    remove_background(input_path=image_path)
