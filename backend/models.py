"""数据模型定义"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    """用户模型"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Dish(Base):
    """培养皿模型"""
    __tablename__ = "dishes"

    dish_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "dish_id": self.dish_id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Fungus(Base):
    """真菌模型 - 文本的具象化表征"""
    __tablename__ = "fungi"

    fungus_id = Column(Integer, primary_key=True, index=True)
    text = Column(String)  # 文本内容
    image_id = Column(String)  # 贴图编号 (如 "03" -> assets/03.png)
    creator_id = Column(Integer, ForeignKey("users.user_id"))  # 创建者
    parent_ids = Column(JSON)  # 父真菌ID列表 (杂交时记录)
    status = Column(String, default="idle")  # idle / incubating / in_air
    location = Column(String, default="air")  # air / dish_id
    unlock_time = Column(DateTime, nullable=True)  # 孵化完成时间戳
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "fungus_id": self.fungus_id,
            "text": self.text,
            "image_id": self.image_id,
            "creator_id": self.creator_id,
            "parent_ids": self.parent_ids,
            "status": self.status,
            "location": self.location,
            "unlock_time": self.unlock_time.isoformat() if self.unlock_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }