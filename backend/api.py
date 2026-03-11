"""FastAPI 主文件 - API 接口"""

import os
import random
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import db
from models import User, Dish, Fungus

# ============ 配置 ============
APP_DIR = os.path.dirname(__file__)
ASSETS_DIR = os.path.join(os.path.dirname(APP_DIR), "assets")

# ============ FastAPI 应用 ============
app = FastAPI(
    title="Petri Dish API",
    description="AI媒介艺术实验 - 真菌文本传播系统"
)

# CORS 支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ 请求模型 ============
class UserCreate(BaseModel):
    name: str

class DishCreate(BaseModel):
    user_id: int
    name: str

class FungusCreate(BaseModel):
    text: str
    user_id: int
    dish_id: Optional[int] = None

class HybridRequest(BaseModel):
    dish_id: int

# ============ 初始化 ============
@app.on_event("startup")
async def startup():
    await db.init()
    print("数据库初始化完成")

# ============ 辅助函数 ============
def get_random_image_id() -> str:
    """随机获取贴图编号 (01-50)"""
    return f"{random.randint(1, 50):02d}"

def get_image_path(image_id: str) -> str:
    """获取图片路径"""
    return os.path.join(ASSETS_DIR, f"{image_id}.png")

def file_exists(path: str) -> bool:
    """检查文件是否存在"""
    return os.path.isfile(path)

# ============ API 端点 ============

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Petri Dish API",
        "version": "1.0.0",
        "description": "AI媒介艺术实验 - 真菌文本传播系统"
    }

# ========== 用户相关 ==========

@app.post("/register")
async def register(user: UserCreate):
    """用户注册"""
    user_id = await db.create_user(user.name)
    if user_id:
        return {
            "code": 200,
            "message": "注册成功",
            "data": {"user_id": user_id, "name": user.name}
        }
    raise HTTPException(status_code=400, detail="注册失败")

@app.get("/user/{user_id}")
async def get_user(user_id: int):
    """获取用户信息"""
    user = await db.get_user(user_id)
    if user:
        return {"code": 200, "data": user}
    raise HTTPException(status_code=404, detail="用户不存在")

# ========== 培养皿相关 ==========

@app.post("/create_dish")
async def create_dish(dish: DishCreate):
    """创建培养皿"""
    dish_id = await db.create_dish(dish.user_id, dish.name)
    if dish_id:
        return {
            "code": 200,
            "message": "创建成功",
            "data": {"dish_id": dish_id, "name": dish.name}
        }
    raise HTTPException(status_code=400, detail="创建失败")

@app.get("/dish/{dish_id}")
async def get_dish(dish_id: int):
    """获取培养皿信息"""
    dish = await db.get_dish(dish_id)
    if dish:
        return {"code": 200, "data": dish}
    raise HTTPException(status_code=404, detail="培养皿不存在")

@app.get("/user/{user_id}/dishes")
async def get_user_dishes(user_id: int):
    """获取用户的所有培养皿"""
    dishes = await db.get_dishes_by_user(user_id)
    return {"code": 200, "data": dishes}

# ========== 真菌相关 ==========

@app.post("/upload")
async def upload_fungus(fungus: FungusCreate):
    """上传文本，生成真菌"""
    # 检查用户是否存在
    user = await db.get_user(fungus.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查培养皿是否存在（如果有指定）
    if fungus.dish_id:
        dish = await db.get_dish(fungus.dish_id)
        if not dish:
            raise HTTPException(status_code=404, detail="培养皿不存在")
    
    # 随机分配贴图
    image_id = get_random_image_id()
    
    # 检查贴图是否存在，不存在则生成默认提示
    image_path = get_image_path(image_id)
    if not file_exists(image_path):
        print(f"提示: 贴图 {image_path} 不存在，请在 assets/ 目录下添加文件")
    
    # 创建真菌
    fungus_id = await db.create_fungus(
        text=fungus.text,
        image_id=image_id,
        creator_id=fungus.user_id,
        parent_ids=None,
        status="idle",
        location=str(fungus.dish_id) if fungus.dish_id else "air"
    )
    
    return {
        "code": 200,
        "message": "真菌生成成功",
        "data": {
            "fungus_id": fungus_id,
            "text": fungus.text,
            "image_id": image_id,
            "location": "培养皿" if fungus.dish_id else "空气"
        }
    }

@app.get("/get_dish/{dish_id}")
async def get_dish_content(dish_id: int):
    """获取培养皿内容（真菌列表）"""
    # 检查培养皿是否存在
    dish = await db.get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")
    
    # 获取培养皿中的真菌
    fungi = await db.get_fungi_by_dish(dish_id)
    
    # 获取真菌创建者信息
    result = []
    for f in fungi:
        creator = await db.get_user(f["creator_id"])
        result.append({
            **f,
            "creator_name": creator["name"] if creator else "未知"
        })
    
    return {
        "code": 200,
        "data": {
            "dish_id": dish_id,
            "dish_name": dish["name"],
            "fungi": result
        }
    }

# ========== 空气传播 ==========

@app.post("/breathe")
async def breathe():
    """空气传播触发 - 将空气中的真菌随机分配到培养皿"""
    # 获取所有空气中的真菌
    air_fungi = await db.get_all_air_fungi()
    
    if not air_fungi:
        return {"code": 200, "message": "空气中没有真菌可传播", "data": []}
    
    # 获取所有培养皿
    all_dishes = []
    # 这里简化处理，实际应该遍历所有用户的所有培养皿
    # 为简化，我们从 air 中的真菌的 creator 获取其培养皿
    for fungus in air_fungi:
        creator = await db.get_user(fungus["creator_id"])
        if creator:
            dishes = await db.get_dishes_by_user(creator["user_id"])
            if dishes:
                all_dishes.extend(dishes)
    
    if not all_dishes:
        return {"code": 200, "message": "没有可用的培养皿", "data": []}
    
    # 随机分配真菌到培养皿
    distributed = []
    for fungus in air_fungi[:5]:  # 每次最多分配 5 个
        target_dish = random.choice(all_dishes)
        await db.update_fungus_location(fungus["fungus_id"], str(target_dish["dish_id"]))
        distributed.append({
            "fungus_id": fungus["fungus_id"],
            "target_dish_id": target_dish["dish_id"],
            "target_dish_name": target_dish["name"]
        })
    
    return {
        "code": 200,
        "message": f"成功分配 {len(distributed)} 个真菌",
        "data": distributed
    }

# ========== 杂交孵化 ==========

@app.post("/trigger_hybrid")
async def trigger_hybrid(request: HybridRequest):
    """触发杂交检查"""
    # 检查培养皿
    dish = await db.get_dish(request.dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")
    
    # 获取培养皿中至少 2 个 idle 真菌
    idle_fungi = await db.get_idle_fungi_in_dish(request.dish_id, 2)
    
    if len(idle_fungi) < 2:
        return {
            "code": 200,
            "message": "培养皿中真菌数量不足（至少需要 2 个）",
            "data": {"fungi_count": len(idle_fungi)}
        }
    
    # 随机选择 2 个父真菌
    parent1, parent2 = random.sample(idle_fungi, 2)
    
    # 这里应该调用 DeepSeek API 进行文本混合
    # 暂时返回模拟结果
    hybrid_text = f"[杂交] {parent1['text'][:10]} + {parent2['text'][:10]}"
    
    # 创建杂交真菌
    new_fungus_id = await db.create_fungus(
        text=hybrid_text,
        image_id=f"{random.randint(1, 50):02d}",
        creator_id=parent1["creator_id"],
        parent_ids=[parent1["fungus_id"], parent2["fungus_id"]],
        status="incubating",
        location=str(request.dish_id)
    )
    
    # 设置孵化完成时间（60秒后）
    unlock_time = datetime.utcnow() + timedelta(seconds=60)
    await db.update_fungus_status(new_fungus_id, "incubating", unlock_time)
    
    return {
        "code": 200,
        "message": "杂交成功，真菌正在孵化中...",
        "data": {
            "new_fungus_id": new_fungus_id,
            "parent_1": {"id": parent1["fungus_id"], "text": parent1["text"]},
            "parent_2": {"id": parent2["fungus_id"], "text": parent2["text"]},
            "hybrid_text": hybrid_text,
            "unlock_in": 60
        }
    }

@app.get("/check_hybrid/{fungus_id}")
async def check_hybrid(fungus_id: int):
    """检查杂交真菌是否孵化完成"""
    fungus = await db.get_fungus(fungus_id)
    if not fungus:
        raise HTTPException(status_code=404, detail="真菌不存在")
    
    if fungus["status"] != "incubating":
        return {
            "code": 200,
            "data": {
                "status": fungus["status"],
                "message": "真菌已处于非孵化状态"
            }
        }
    
    now = datetime.utcnow()
    unlock_time = datetime.fromisoformat(fungus["unlock_time"]) if fungus["unlock_time"] else None
    
    if unlock_time and now >= unlock_time:
        # 孵化完成
        await db.update_fungus_status(fungus_id, "idle")
        return {
            "code": 200,
            "data": {
                "status": "idle",
                "message": "真菌孵化完成！",
                "fungus": fungus
            }
        }
    
    remaining = (unlock_time - now).seconds if unlock_time else 60
    return {
        "code": 200,
        "data": {
            "status": "incubating",
            "message": f"真菌正在孵化中，剩余时间: {remaining}秒"
        }
    }

# ========== 图片资源 ==========

@app.get("/assets/{image_id}.png")
async def get_asset(image_id: str):
    """获取真菌贴图"""
    image_path = get_image_path(image_id)
    if file_exists(image_path):
        return FileResponse(image_path)
    raise HTTPException(status_code=404, detail="贴图不存在")

# ========== 系统状态 ==========

@app.get("/status")
async def get_status():
    """获取系统状态"""
    return {
        "code": 200,
        "data": {
            "database": "connected",
            "assets_dir": ASSETS_DIR,
            "assets_exist": file_exists(get_image_path("01"))
        }
    }