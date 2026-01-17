from ..config import settings
api_key = settings.google_api_key

if not api_key:
    print("⚠️ تحذير: لم يتم العثور على GOOGLE_API_KEY في ملف .env")

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