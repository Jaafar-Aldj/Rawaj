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



@app.get("/")
def read_root():
    return {"message": "Rawaj Backend is Running! 🚀"}