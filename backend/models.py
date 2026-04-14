"""
Petri Dish 数据模型
使用 Pydantic 定义请求/响应模型
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ==================== 请求模型 ====================

class RegisterRequest(BaseModel):
    """用户注册请求"""
    name: str


class CreateDishRequest(BaseModel):
    """创建培养皿请求"""
    user_id: str
    name: str


class UploadRequest(BaseModel):
    """上传文本请求"""
    user_id: str
    content: str
    dish_id: Optional[str] = None
    image_id: Optional[str] = None
    dna_prompt: Optional[str] = None


class BreatheRequest(BaseModel):
    """呼吸请求"""
    dish_id: str


class TriggerHybridRequest(BaseModel):
    """触发杂交请求"""
    fungus1_id: str
    fungus2_id: str


# ==================== 响应模型 ====================

class UserResponse(BaseModel):
    """用户响应"""
    user_id: str
    name: str
    created_at: Optional[str] = None


class DishResponse(BaseModel):
    """培养皿响应"""
    dish_id: str
    user_id: str
    name: str
    created_at: Optional[str] = None
    fungus_count: Optional[int] = 0


class FungusResponse(BaseModel):
    """真菌响应"""
    fungus_id: str
    dish_id: Optional[str] = None
    user_id: str
    content: str
    image_id: str
    status: str
    location: str
    is_parent: Optional[bool] = False  # 是否已作为亲本参与杂交
    unlock_time: Optional[str] = None
    parent1_id: Optional[str] = None
    parent2_id: Optional[str] = None
    parent1_image_id: Optional[str] = None  # 父母真菌的颜色样式ID
    parent2_image_id: Optional[str] = None  # 父母真菌的颜色样式ID
    dna_prompt: Optional[str] = None  # 真菌的DNA提示词
    fall_remaining: Optional[int] = None  # 空气真菌剩余落入次数
    created_at: Optional[str] = None


class DishDetailResponse(BaseModel):
    """培养皿详情响应（包含真菌列表）"""
    dish: DishResponse
    fungi: List[FungusResponse] = []


class AirResponse(BaseModel):
    """空气响应（空气中的真菌列表）"""
    fungi: List[FungusResponse] = []


class MessageResponse(BaseModel):
    """通用消息响应"""
    message: str
    data: Optional[dict] = None