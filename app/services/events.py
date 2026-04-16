import requests
from datetime import datetime
from app.config import settings

def get_upcoming_events(country="SA"):
    """
    جلب الأعياد والأحداث الحقيقية القادمة في هذا الشهر.
    الافتراضي هو السعودية (SA) كممثل لمنطقة الشرق الأوسط.
    يمكن تغييره إلى AE, EG, QA وغيرها.
    """
    if not settings.calendarific_api_key:
        return "No real-time events available (API key missing)."

    now = datetime.now()
    year = now.year
    month = now.month
    day = now.day

    url = "https://calendarific.com/api/v2/holidays"
    params = {
        "api_key": settings.calendarific_api_key,
        "country": country,
        "year": year,
        "month": month # جلب أحداث هذا الشهر فقط لتقليل البيانات
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            holidays = data.get("response", {}).get("holidays", [])

            upcoming = []
            for h in holidays:
                # استخراج اليوم للتحقق مما إذا كان الحدث في المستقبل
                h_date = h.get("date", {}).get("datetime", {})
                h_day = h_date.get("day", 0)
                
                # تصفية الأحداث التي مضت، وجلب الأحداث القادمة فقط
                if h_day >= day:
                    name = h.get("name")
                    date_iso = h.get("date", {}).get("iso")
                    event_type = h.get("type", ["General"])[0]
                    upcoming.append(f"- {name} ({date_iso}) [Type: {event_type}]")

            if upcoming:
                # نأخذ أول 5 أحداث قادمة فقط لكي لا نشتت الذكاء الاصطناعي
                events_str = "\n".join(upcoming[:5])
                return f"REAL UPCOMING EVENTS IN MENA REGION:\n{events_str}"
            else:
                return "No major upcoming events for the rest of this month."
        else:
            return "Could not fetch real-time events from API."
            
    except Exception as e:
        print(f"⚠️ Calendarific API Error: {e}")
        return "Error fetching real-time events."

# لتجربة الملف بشكل منفصل:
if __name__ == "__main__":
    print(get_upcoming_events())