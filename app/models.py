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
    status = Column(String, server_default='DRAFT') # DRAFT, PENDING, COMPLETED
    suggested_audiences = Column(JSONB, nullable=True) 
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
    image_prompt = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    video_prompt = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    is_approved = Column(Boolean, server_default=text('false'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    campaign = relationship("Campaigns", back_populates="assets")
    image_versions = relationship("ImageVersions", back_populates="asset", cascade="all, delete")
    video_versions = relationship("VideoVersions", back_populates="asset", cascade="all, delete")

# 5. Image Versions (الجديد)
class ImageVersions(Base):
    __tablename__ = "image_versions"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("campaign_assets.id", ondelete="CASCADE"), nullable=False)
    
    image_url = Column(String, nullable=False)
    prompt = Column(Text, nullable=True)
    version_number = Column(Integer, default=1)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    
    asset = relationship("CampaignAssets", back_populates="image_versions")

# 6. Video Versions (الجديد)
class VideoVersions(Base):
    __tablename__ = "video_versions"
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("campaign_assets.id", ondelete="CASCADE"), nullable=False)
    
    video_url = Column(String, nullable=False)
    prompt = Column(Text, nullable=True)
    version_number = Column(Integer, default=1)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    
    asset = relationship("CampaignAssets", back_populates="video_versions")