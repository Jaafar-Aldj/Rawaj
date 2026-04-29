import asyncio
from typing import Dict

from app.logger import get_logger
logger = get_logger(__name__)

active_connections: Dict[str, asyncio.Queue] = {}

def get_queue(process_id: str) -> asyncio.Queue:
    """الحصول على طابور الإشعارات لعملية محددة"""
    if process_id not in active_connections:
        active_connections[process_id] = asyncio.Queue()
    return active_connections[process_id]

async def send_notification(process_id: str, message: str):
    """إرسال إشعار للفرونت إند"""
    if process_id in active_connections:
        await active_connections[process_id].put(message)
    logger.info(f"[Notification -> {process_id}]: {message}")

async def close_connection(process_id: str):
    """إغلاق الاتصال عند انتهاء العملية"""
    if process_id in active_connections:
        await active_connections[process_id].put("[DONE]") # رسالة خاصة لإنهاء الاستماع
        