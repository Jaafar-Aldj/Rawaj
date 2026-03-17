from ..config import settings
api_key = settings.google_api_key

if not api_key:
    print("⚠️ تحذير: لم يتم العثور على GOOGLE_API_KEY في ملف .env")

llm_config = {
    "config_list": [
        {
            "model": "gemini-2.5-flash", 
            "api_key": api_key,
            "api_type": "google"
        }
    ],
    "cache_seed": 42 
}

directory_config = {
    "config_list": [
        {
            "model": "gemini-2.5-pro", 
            "api_key": api_key,
            "api_type": "google"
        }
    ],
    "cache_seed": 42 
}