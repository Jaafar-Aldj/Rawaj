from .database import Base
from sqlalchemy import TIMESTAMP, Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql.expression import text
from sqlalchemy.orm import relationship

# 1. Users
class Users(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    verification_code = Column(String, nullable=True)
    is_verified = Column(Boolean, server_default='false')
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))

# 2. Products
class Products(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    original_image_url = Column(String, nullable=True)
    processed_image_url = Column(String, nullable=True)
    image_analysis = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    
    owner = relationship("Users")

# 3. Campaigns
class Campaigns(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False) 
    name = Column(String, nullable=True)          
    objective = Column(String, nullable=True)
    status = Column(String, server_default='DRAFT') # DRAFT, PENDING, COMPLETED
    suggested_audiences = Column(JSONB, nullable=True) 
    posting_strategy = Column(JSONB, nullable=True)  
    trending_events = Column(JSONB, nullable=True)
    chat_history = Column(JSONB, nullable=True, default=[])
    is_strategy_approved = Column(Boolean, server_default=text('false'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))

    product = relationship("Products")
    assets = relationship("CampaignAssets", back_populates="campaign", cascade="all, delete")

# 4. Campaign Assets
class CampaignAssets(Base):
    __tablename__ = "campaign_assets"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    target_audience = Column(String, nullable=True)
    ad_copy = Column(JSONB, nullable=True) 
    is_approved = Column(Boolean, server_default=text('false'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))

    campaign = relationship("Campaigns", back_populates="assets")
    images = relationship("ImageAssets", back_populates="asset", cascade="all, delete")
    videos = relationship("VideoAssets", back_populates="asset", cascade="all, delete")


# 5. Image Assets
class ImageAssets(Base):
    __tablename__ = "image_assets"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("campaign_assets.id", ondelete="CASCADE"), nullable=False)
    
    image_url = Column(String, nullable=False)
    prompt = Column(Text, nullable=True)
    
    aspect_ratio = Column(String, default="1:1") # "1:1", "9:16", "16:9"
    platform = Column(String, nullable=True) # "instagram", "tiktok"
    event_name = Column(String, nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    
    asset = relationship("CampaignAssets", back_populates="images")


# 6. Video Assets
class VideoAssets(Base):
    __tablename__ = "video_assets"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("campaign_assets.id", ondelete="CASCADE"), nullable=False)
    
    video_url = Column(String, nullable=False)
    video_storyboard = Column(JSONB, nullable=True)
    
    # إضافة جديدة: حفظ المدة والمقاس
    duration_seconds = Column(Integer, default=8)
    aspect_ratio = Column(String, default="16:9")
    event_name = Column(String, nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    
    asset = relationship("CampaignAssets", back_populates="videos")

