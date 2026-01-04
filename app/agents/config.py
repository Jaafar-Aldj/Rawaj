import os
from dotenv import load_dotenv

# تحميل المفاتيح
load_dotenv()

api_key = os.environ.get("GOOGLE_API_KEY")

if not api_key:
    print("⚠️ تحذير: لم يتم العثور على GOOGLE_API_KEY في ملف .env")

# إعدادات الموديل (هذا هو المتغير الذي يبحث عنه ملف الاختبار)
llm_config = {
    "config_list": [
        {
            "model": "gemini-2.0-flash", # الموديل السريع والذكي الذي اخترناه
            "api_key": api_key,
            "api_type": "google"
        }
    ],
    "cache_seed": 42 # لتسريع الاستجابة في حال تكرار السؤال
}