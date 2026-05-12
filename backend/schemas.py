from pydantic import BaseModel, Field
from typing import Literal, Optional


Platform = Literal["instagram", "twitter", "facebook"]
RiskLevel = Literal["safe", "suspicious", "likely_fake"]
Confidence = Literal["low", "medium", "high"]


class FeatureInput(BaseModel):
    platform: Platform
    username: str = ""
    full_name: str = ""
    bio: str = ""
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    has_profile_pic: bool = True
    has_external_url: bool = False
    is_private: bool = False


class LinkInput(BaseModel):
    url: str


class UsernameInput(BaseModel):
    username: str
    platform: Platform = "instagram"


class BioInput(BaseModel):
    text: str


class Reason(BaseModel):
    label: str
    impact: Literal["positive", "negative", "neutral"]


class PredictionResult(BaseModel):
    is_fake: bool
    fake_probability: float
    confidence: Confidence
    risk_level: RiskLevel
    reasons: list[Reason]
    top_features: list[dict] = Field(default_factory=list)
    extracted: Optional[FeatureInput] = None
    notes: list[str] = Field(default_factory=list)


class ScrapeResult(BaseModel):
    success: bool
    platform: Platform
    extracted: Optional[FeatureInput] = None
    message: str = ""
