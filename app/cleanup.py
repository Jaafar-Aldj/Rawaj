import os
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models

from app.logger import get_logger
logger = get_logger(__name__)

# مسارات المجلدات التي تحتوي على الملفات
UPLOAD_DIR = "rawaj-frontend/assets/upload"
IMAGE_DIR = "rawaj-frontend/assets/image"
VIDEO_DIR = "rawaj-frontend/assets/video"

def get_all_active_files_from_db(db: Session):
    """
    تستخرج جميع أسماء الملفات (الصور والفيديوهات) المرتبطة بقاعدة البيانات حالياً
    لتجنب حذفها.
    """
    active_files = set()

    # 1. صور المنتجات الأصلية والمقصوصة
    products = db.query(models.Products).all()
    for p in products:
        if p.original_image_url: active_files.add(os.path.basename(p.original_image_url))
        if p.processed_image_url: active_files.add(os.path.basename(p.processed_image_url))

    # 2. صور الإصدارات (Image Versions)
    images = db.query(models.ImageAssets).all()
    for img in images:
        if img.image_url: active_files.add(os.path.basename(img.image_url))

    # 3. فيديوهات الإصدارات (Video Versions)
    videos = db.query(models.VideoAssets).all()
    for vid in videos:
        if vid.video_url: active_files.add(os.path.basename(vid.video_url))

    return active_files

def cleanup_orphaned_files():
    """
    تقوم بمسح المجلدات، وحذف أي ملف غير موجود في قاعدة البيانات، 
    أو أي ملفات مؤقتة (تبدأ بـ temp_).
    """
    logger.info("Starting Garbage Collection...")
    db = SessionLocal()
    try:
        active_files = get_all_active_files_from_db(db)
        deleted_count = 0

        # فحص جميع المجلدات
        for directory in [UPLOAD_DIR, IMAGE_DIR, VIDEO_DIR]:
            if not os.path.exists(directory):
                continue
                
            for filename in os.listdir(directory):
                file_path = os.path.join(directory, filename)
                
                # تخطي المجلدات الفرعية
                if os.path.isdir(file_path): continue

                # 1. حذف الملفات المؤقتة فوراً (التي تنشأ أثناء الدمج)
                if filename.startswith("temp_"):
                    try:
                        os.remove(file_path)
                        logger.info(f"Deleted temp file: {filename}")
                        deleted_count += 1
                    
                    except Exception as e:
                        logger.error(f"Error deleting temp file {filename}: {e}")
                    continue

                # 2. حذف الملفات "اليتيمة" (التي ليس لها قيود في الداتا بيز)
                # نتجاهل الملفات الأساسية مثل placeholder.png إن وجدت
                if filename not in active_files and filename != "placeholder.png":
                    try:
                        os.remove(file_path)
                        logger.info(f"Deleted orphaned file: {filename}")
                        deleted_count += 1
                    except Exception as e:
                        logger.error(f"Error deleting orphaned file {filename}: {e}")

        logger.info(f"Cleanup Complete! Total files deleted: {deleted_count}")
    
    except Exception as e:
        logger.error(f"Cleanup Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_orphaned_files()