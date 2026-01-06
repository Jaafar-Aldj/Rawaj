from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# إضافة المسارات
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.agents.manager import run_campaign_meeting

app = FastAPI(title="Rawaj API")

# السماح لزميلك بالاتصال (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # يسمح لأي فرونت إند بالاتصال
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# شكل البيانات القادمة من الفرونت إند
class CampaignRequest(BaseModel):
    product_name: str
    product_desc: str

@app.post("/generate_campaign")
async def generate_campaign(request: CampaignRequest):
    try:
        # تشغيل الوكلاء والحصول على النتيجة
        # ملاحظة: سنحتاج تعديل دالة run_campaign_meeting لترجع قيمة بدلاً من الطباعة فقط
        result = run_campaign_meeting(request.product_name, request.product_desc)
        
        return {
            "status": "success",
            "data": result 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Rawaj Backend is Running! 🚀"}