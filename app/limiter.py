from slowapi import Limiter
from slowapi.util import get_remote_address

# المعدّل الافتراضي: 60 طلب/دقيقة لكل IP
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])