from datetime import datetime
from pydantic import BaseModel, EmailStr 
from typing import List, Optional, Dict, Any

# --- User Schemas ---
class UserCreate(BaseModel): # للفصل بين الإنشاء والقراءة
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel): # ما نعيده للمستخدم (بدون باسورد)
    id: int
    username: str
    email: EmailStr
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    description: str
    original_image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Campaign Schemas ---
class CampaignBase(BaseModel):
    product_id: int
    status: Optional[str] = "DRAFT"
    suggested_audiences: Optional[Dict[str, Any]] = None 



# --- Assets Schemas ---
class AssetBase(BaseModel):
    target_audience: str
    ad_copy: Optional[Dict[str, Any]] = None 
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None
    video_prompt: Optional[str] = None
    video_url: Optional[str] = None
    is_approved: bool = False

class AssetCreate(AssetBase):
    pass

class AssetResponse(AssetBase):
    id: int
    campaign_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Campaign Response Schema ---
class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    assets: List[AssetResponse] = [] 
    
    class Config:
        from_attributes = True
