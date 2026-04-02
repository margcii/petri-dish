"""
Petri Dish FastAPI 接口
"""

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import random
import string
from datetime import datetime

from database import db
from models import (
    RegisterRequest, CreateDishRequest, UploadRequest, 
    BreatheRequest, TriggerHybridRequest,
    UserResponse, DishResponse, FungusResponse, 
    DishDetailResponse, AirResponse, MessageResponse
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时连接数据库
    await db.connect()
    print("Database connected")
    yield
    # 关闭时断开连接
    await db.close()
    print("Database closed")


app = FastAPI(
    title="Petri Dish API",
    description="AI媒介艺术实验 - 真菌隐喻文本传播与杂交",
    version="0.1.0",
    lifespan=lifespan
)


def generate_image_id(length: int = 8) -> str:
    """生成随机图片ID"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


# ==================== 用户接口 ====================

@app.post("/register", response_model=UserResponse)
async def register(request: RegisterRequest):
    """用户注册"""
    user_id = await db.create_user(request.name)
    user = await db.get_user(user_id)
    return UserResponse(**user)


@app.get("/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """获取用户信息"""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserResponse(**user)


# ==================== 培养皿接口 ====================

@app.post("/create_dish", response_model=DishResponse)
async def create_dish(request: CreateDishRequest):
    """创建培养皿"""
    # 验证用户存在
    user = await db.get_user(request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    dish_id = await db.create_dish(request.user_id, request.name)
    dish = await db.get_dish(dish_id)
    return DishResponse(**dish)


@app.get("/get_dish/{dish_id}", response_model=DishDetailResponse)
async def get_dish(dish_id: str):
    """获取培养皿详情（包含真菌列表）"""
    dish = await db.get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")
    
    fungi = await db.get_dish_fungi(dish_id)
    return DishDetailResponse(
        dish=DishResponse(**dish),
        fungi=[FungusResponse(**f) for f in fungi]
    )


@app.get("/user_dishes/{user_id}")
async def get_user_dishes(user_id: str):
    """获取用户的所有培养皿"""
    dishes = await db.get_user_dishes(user_id)
    return {"dishes": [DishResponse(**d) for d in dishes]}


# ==================== 真菌接口 ====================

@app.post("/upload", response_model=FungusResponse)
async def upload(request: UploadRequest):
    """上传文本生成真菌"""
    # 验证用户存在
    user = await db.get_user(request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 使用前端提供的 image_id，如果没有则生成随机值
    image_id = request.image_id if request.image_id else generate_image_id()
    
    # 确定位置和状态
    if request.dish_id:
        dish = await db.get_dish(request.dish_id)
        if not dish:
            raise HTTPException(status_code=404, detail="培养皿不存在")
        location = "dish"
        status = "idle"
    else:
        location = "air"
        status = "in_air"
    
    fungus_id = await db.create_fungus(
        user_id=request.user_id,
        content=request.content,
        image_id=image_id,
        dish_id=request.dish_id,
        status=status,
        location=location
    )
    
    fungus = await db.get_fungus(fungus_id)
    return FungusResponse(**fungus)


@app.get("/air", response_model=AirResponse)
async def get_air():
    """获取空气中的真菌"""
    fungi = await db.get_air_fungi()
    return AirResponse(fungi=[FungusResponse(**f) for f in fungi])


@app.post("/breathe", response_model=MessageResponse)
async def breathe(request: BreatheRequest):
    """呼吸 - 将空气中的真菌吸入培养皿"""
    dish = await db.get_dish(request.dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")
    
    air_fungi = await db.get_air_fungi()
    if not air_fungi:
        return MessageResponse(message="空气中没有真菌")
    
    # 随机选择一个真菌吸入
    import random
    fungus = random.choice(air_fungi)
    
    await db.update_fungus_status(
        fungus_id=fungus["fungus_id"],
        status="idle",
        location="dish",
        dish_id=request.dish_id
    )
    
    return MessageResponse(
        message=f"真菌 {fungus['fungus_id'][:8]}... 已吸入培养皿",
        data={"fungus_id": fungus["fungus_id"]}
    )


@app.post("/trigger_hybrid", response_model=FungusResponse)
async def trigger_hybrid(request: TriggerHybridRequest):
    """触发杂交"""
    fungus1 = await db.get_fungus(request.fungus1_id)
    fungus2 = await db.get_fungus(request.fungus2_id)
    
    if not fungus1 or not fungus2:
        raise HTTPException(status_code=404, detail="真菌不存在")
    
    # 创建杂交真菌
    hybrid_content = f"{fungus1['content'][:50]} + {fungus2['content'][:50]}"
    image_id = generate_image_id()
    
    hybrid_id = await db.create_hybrid_fungus(
        user_id=fungus1["user_id"],
        content=hybrid_content,
        image_id=image_id,
        parent1_id=fungus1["fungus_id"],
        parent2_id=fungus2["fungus_id"]
    )
    
    hybrid = await db.get_fungus(hybrid_id)
    return FungusResponse(**hybrid)


@app.get("/check_hybrid/{fungus_id}", response_model=FungusResponse)
async def check_hybrid(fungus_id: str):
    """检查杂交状态"""
    fungus = await db.get_fungus(fungus_id)
    if not fungus:
        raise HTTPException(status_code=404, detail="真菌不存在")
    
    # 检查是否孵化完成（60秒后）
    if fungus["unlock_time"]:
        unlock_time = datetime.fromisoformat(fungus["unlock_time"])
        if datetime.now() >= unlock_time:
            # 更新状态为 idle
            await db.update_fungus_status(fungus_id, status="idle")
            fungus["status"] = "idle"
    
    return FungusResponse(**fungus)


# ==================== 健康检查 ====================

@app.get("/")
async def root():
    """根路径"""
    return {"message": "Petri Dish API 正在运行", "version": "0.1.0"}


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)