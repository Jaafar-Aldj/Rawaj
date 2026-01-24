from datetime import datetime
from pydantic import BaseModel, EmailStr 
from typing import List, Optional, Dict, Any

# --- User Schemas ---
class UserCreate(BaseModel): # للفصل بين الإنشاء والقراءة
    name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel): # ما نعيده للمستخدم (بدون باسورد)
    id: int
    name: str
    email: EmailStr
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserVerify(BaseModel):
    user_id: int
    code: str

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

class DraftRequest(BaseModel):
    campaign_id: int
    selected_audiences: List[str]

class DraftEditRequest(BaseModel):
    asset_id: int
    feedback: str 
    edit_type: str #"text", "image", or "both"

class FinalizeRequest(BaseModel):
    campaign_id: int

# --- Assets Schemas ---
class AssetBase(BaseModel):
    target_audience: str
    ad_copy: Optional[Dict[str, Any]] = None 
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    is_approved: bool = False

class AssetCreate(AssetBase):
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    campaign_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ApproveRequest(BaseModel):
    asset_id: int


# --- Campaign Response Schema ---
class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    assets: List[AssetResponse] = [] 
    
    class Config:
        from_attributes = True



## --- Token Schemas --- 
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None