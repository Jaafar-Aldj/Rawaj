import os
import httpx
from datetime import date, timedelta
from dataclasses import dataclass
from app.config import settings
from typing_extensions import Annotated

from app.logger import get_logger
logger = get_logger(__name__)

# Calendarific API configuration
CALENDARIFIC_API_KEY = settings.calendarific_api_key
CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2/holidays"

REGION_TO_COUNTRIES = {
    "GCC": ["ae", "sa", "qa", "kw", "bh", "om"],  
    "Middle East": ["ae", "sa", "eg", "jo", "lb", "qa", "kw", "om"],  
    "North Africa": ["eg", "ma", "dz", "tn"], 
}

DIRECT_COUNTRY_MAP = {
    "UAE": "ae", "Saudi Arabia": "sa", "KSA": "sa", "Egypt": "eg", "Qatar": "qa"
}

@dataclass
class RegionalEvent:
    name: str
    description: str
    event_type: str 
    date: str
    country: str = ""

def _get_countries_for_region(region: str) -> list[str]:
    # 1. إذا كان المدخل كود دولة من حرفين (مثل sy, ye, eg)، نقبله فوراً!
    if len(region) == 2 and region.isalpha():
        logger.info(f"Received direct country code: {region}")
        return [region.lower()]
        
    logger.info(f"Received region input: {region}") 
    # 2. البحث في القواميس للمناطق الأكبر (مثل GCC أو Middle East)
    if region in REGION_TO_COUNTRIES: return REGION_TO_COUNTRIES[region]
    if region in DIRECT_COUNTRY_MAP: return [DIRECT_COUNTRY_MAP[region]]
    if region.title() in REGION_TO_COUNTRIES: return REGION_TO_COUNTRIES[region.title()]
    
    logger.warning(f"Region '{region}' not recognized. Defaulting to Saudi Arabia (sa).")
    # 3. الافتراضي فقط إذا كان النص غير مفهوم أبداً
    return ["sa"]

def _fetch_events_for_country_month(target_date: date, country_code: str) -> list[RegionalEvent]:
    """
    نسخة متزامنة (Sync) صاروخية تجلب أحداث الشهر كاملاً بطلب واحد فقط!
    """
    if not CALENDARIFIC_API_KEY: 
        logger.error("Calendarific API key is missing. Cannot fetch events.")
        return []
    
    params = {
        "api_key": CALENDARIFIC_API_KEY,
        "country": country_code,
        "year": target_date.year,
        "month": target_date.month, # نطلب الشهر كاملاً
        "type": "national,religious,observance"
    }
    
    try:
        # استخدام httpx.Client المتزامن لمنع تجمد السيرفر
        with httpx.Client(timeout=10.0) as client:
            response = client.get(CALENDARIFIC_BASE_URL, params=params)
            if response.status_code != 200: 
                logger.error(f"Error fetching events for {country_code}: {response.status_code}")
                return []
            data = response.json()
        
        response_obj = data.get("response", {})
        holidays = response_obj.get("holidays", []) if isinstance(response_obj, dict) else []
        
        events = []
        for h in holidays:
            if not isinstance(h, dict): continue
            
            # استخراج التاريخ الفعلي للحدث من הـ API
            event_iso = h.get("date", {}).get("iso", str(target_date))
            
            events.append(RegionalEvent(
                name=h.get("name", "Unknown Event"),
                description=h.get("description", ""),
                event_type=h.get("type", ["observance"])[0] if h.get("type") else "observance",
                date=event_iso,
                country=country_code
            ))
        logger.info(f"[EventsEngine] Fetched {len(events)} events for {country_code} in {target_date.strftime('%B %Y')}")
        logger.info(f"Events: {events[:3]}")  # طباعة أول 3 أحداث للتأكد من البيانات
        return events
    except Exception as e:
        logger.error(f"[EventsEngine] Error fetching {country_code}: {e}")
        return []

def should_create_event_content(event: RegionalEvent) -> bool:
    if event.event_type in ("national", "religious"): return True
    significant_observances = ["mother", "father", "valentine", "new year", "eid", "ramadan", "national day"]
    return any(obs in event.name.lower() for obs in significant_observances)

def get_upcoming_events_for_strategy(region: str = "GCC", days_ahead: int = 30) -> str:
    """
    الدالة الرئيسية التي يستخدمها الـ Manager.
    الآن أصبحت سريعة جداً لأنها تقوم بـ (عدد الدول) طلبات فقط بدلاً من 180 طلب!
    """
    if not settings.calendarific_api_key:
        logger.error("Calendarific API key is missing. Cannot fetch events.")
        return "No real-time events available (API key missing)."
        
    start_date = date.today()
    end_date = start_date + timedelta(days=days_ahead)
    countries = _get_countries_for_region(region)
    
    upcoming_events = []
    seen_names = set()
    
    logger.info(f"Fetching events for {len(countries)} countries in {region}...")

    for country_code in countries:
        # جلب أحداث الشهر الحالي لهذه الدولة
        events = _fetch_events_for_country_month(start_date, country_code)
        
        # إذا كان days_ahead يمتد للشهر القادم، نجلبه أيضاً بطلب واحد إضافي
        if start_date.month != end_date.month:
            events.extend(_fetch_events_for_country_month(end_date, country_code))

        # تصفية الأحداث (للتأكد أنها في نطاق الـ 30 يوماً ومهمة وغير مكررة)
        for event in events:
            try:
                # تحويل تاريخ الحدث لنقاطعه مع تاريخنا
                event_date_obj = date.fromisoformat(event.date.split("T")[0])
                
                # هل الحدث يقع بين اليوم و 30 يوماً من الآن؟
                if start_date <= event_date_obj <= end_date:
                    # هل هو مهم؟ وهل لم نضفه مسبقاً (لمنع التكرار بين الدول)؟
                    if should_create_event_content(event) and event.name not in seen_names:
                        seen_names.add(event.name)
                        upcoming_events.append(event)
            except:
                pass # تجاهل الأحداث ذات التواريخ غير الصالحة

    # ترتيب الأحداث زمنيّاً (من الأقرب للأبعد)
    upcoming_events.sort(key=lambda x: x.date)

    if upcoming_events:
        events_str = "\n".join([f"- {e.name} ({e.date})" for e in upcoming_events[:7]])
        return f"REAL UPCOMING SIGNIFICANT EVENTS:\n{events_str}"
    else:
        return f"No major upcoming events found for the next {days_ahead} days."
   


def fetch_country_events_tool(
    country_code: Annotated[str, "The 2-letter ISO code of the country (e.g., 'SA' for Saudi Arabia, 'AE' for UAE, 'EG' for Egypt)."]
) -> str:
    """
    أداة للذكاء الاصطناعي لجلب الأحداث القادمة (30 يوماً) لدولة محددة.
    """
    if not settings.calendarific_api_key:
        return "Error: Calendarific API key is missing."
        
    start_date = date.today()
    end_date = start_date + timedelta(days=30)
    
    logger.info(f"AI requested events for country: {country_code.upper()}...")
    
    upcoming_events = []
    seen_names = set()
    
    # نجلب أحداث الشهر الحالي
    events = _fetch_events_for_country_month(start_date, country_code.lower())
    
    # وإذا كنا قريبين من نهاية الشهر، نجلب الشهر القادم أيضاً
    if start_date.month != end_date.month:
        events.extend(_fetch_events_for_country_month(end_date, country_code.lower()))

    for event in events:
        try:
            event_date_obj = date.fromisoformat(event.date.split("T")[0])
            if start_date <= event_date_obj <= end_date:
                # نأخذ الأحداث المهمة فقط لتجنب إغراق الذكاء الاصطناعي
                if should_create_event_content(event) and event.name not in seen_names:
                    seen_names.add(event.name)
                    upcoming_events.append(event)
        except Exception as e:
            logger.warning(f"Skipping event with invalid date: {event.name}, error: {e}")
            continue

    upcoming_events.sort(key=lambda x: x.date)

    if upcoming_events:
        events_str = "\n".join([f"- {e.name} ({e.date})" for e in upcoming_events[:7]])
        return f"REAL UPCOMING EVENTS IN {country_code.upper()}:\n{events_str}"
    else:
        return f"No major upcoming events found in {country_code.upper()} for the next 30 days."



if __name__ == "__main__":
    import time
    start = time.time()
    # تجربة سريعة لجلب أحداث الـ 30 يوم القادمة للخليج
    print(get_upcoming_events_for_strategy("GCC", 30))
    print(f"⏱️ Time taken: {time.time() - start:.2f} seconds")