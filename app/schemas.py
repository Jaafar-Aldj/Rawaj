from datetime import datetime
from pydantic import BaseModel, EmailStr 
from typing import List, Optional, Dict, Any

# ==============================================================================
# User Schemas
# ==============================================================================
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
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

# ==============================================================================
# Product Schemas
# ==============================================================================
class ProductBase(BaseModel):
    name: str
    description: str
    original_image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    user_id: int
    image_analysis: Optional[str] = None
    processed_image_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==============================================================================
# Media Assets Schemas (الجديدة)
# ==============================================================================
class ImageAssetResponse(BaseModel):
    id: int
    asset_id: int
    image_url: str
    prompt: Optional[str] = None
    aspect_ratio: str
    platform: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VideoAssetResponse(BaseModel):
    id: int
    asset_id: int
    video_url: str
    video_storyboard: Optional[List[Dict[str, Any]]] = None
    duration_seconds: int
    aspect_ratio: str
    created_at: datetime

    class Config:
        from_attributes = True

# ==============================================================================
# Campaign Assets Schemas 
# ==============================================================================
class AssetBase(BaseModel):
    target_audience: str
    ad_copy: Optional[Dict[str, Any]] = None 
    is_approved: bool = False

class AssetCreate(AssetBase):
    pass

class AssetResponse(AssetBase):
    id: int
    campaign_id: int
    target_audience: str
    ad_copy: Optional[Any] = None 
    is_approved: bool
    created_at: datetime
    
    # العلاقات الجديدة (قوائم الصور والفيديو)
    images: List[ImageAssetResponse] = []
    videos: List[VideoAssetResponse] = []
    
    class Config:
        from_attributes = True

# ==============================================================================
# Campaign Schemas
# ==============================================================================
class CampaignBase(BaseModel):
    product_id: int
    name: Optional[str] = None
    objective: Optional[str] = None
    status: Optional[str] = "DRAFT"
    suggested_audiences: Optional[Dict[str, Any]] = None 
    posting_strategy: Optional[Dict[str, Any]] = None
    trending_events: Optional[List[Dict[str, Any]]] = None

class AnalyzeRequest(BaseModel):
    product_id: int
    campaign_name: Optional[str] = None
    campaign_objective: Optional[str] = None

class DraftCopyRequest(BaseModel):
    campaign_id: int
    selected_audiences: List[str]
    selected_platforms: Optional[List[str]] = None # مثال: ["Instagram", "Facebook"]

class EditTextRequest(BaseModel):
    asset_id: int
    feedback: str

class GenerateImageRequest(BaseModel):
    asset_id: int
    aspect_ratio: str = "1:1"
    platform: Optional[str] = "Instagram"

class EditImageRequest(BaseModel):
    image_id: int 
    feedback: str

class GenerateVideoRequest(BaseModel):
    asset_id: int
    video_duration: int = 8
    aspect_ratio: str = "16:9"

class EditVideoRequest(BaseModel):
    video_id: int 
    feedback: str 

class FinalizeRequest(BaseModel):
    campaign_id: int

class ApproveRequest(BaseModel):
    asset_id: int

class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    product: Optional[ProductResponse] = None
    assets: List[AssetResponse] = [] 
    
    class Config:
        from_attributes = True

# ==============================================================================
# Token Schemas
# ==============================================================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None