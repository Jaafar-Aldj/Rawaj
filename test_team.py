import sys
import os

# إضافة مجلد app للمسار لكي يرى البايثون الملفات
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.agents.manager import run_campaign_meeting

if __name__ == "__main__":
    print("🚀 Starting Rawaj Marketing Team...")
    print("-" * 50)
    
    # بيانات منتج وهمي للتجربة
    product = "مغسلة جوني"
    description = "خدمة غسيل ملابس مع كوي ,خدمة سريعة, دوام 24 ع 24, اسعار مناسبة"
    
    run_campaign_meeting(product, description)