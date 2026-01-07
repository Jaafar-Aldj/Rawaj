import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.agents.manager import run_campaign_meeting

if __name__ == "__main__":
    print("🚀 Starting Rawaj Marketing Team...")
    
    # منتج جديد للتجربة
    product = "عطر ليالي الصحراء (Desert Nights Perfume)"
    description = "عطر شرقي فاخر برائحة العود والعنبر، زجاجة سوداء وذهبية، للجنسين."
    
    # تشغيل النظام واستلام النتائج
    result = run_campaign_meeting(product, description)
    
    print("\n" + "="*50)
    print("✅ MISSION COMPLETE")
    print(f"🖼️ Generated Image saved at: {result.get('image_path')}")
    print("="*50)