"""
Petri Dish FastAPI 接口
"""

from dotenv import load_dotenv
from pathlib import Path
# 加载环境变量（显式指定 .env 文件路径）
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

from fastapi import FastAPI, HTTPException, Query
from contextlib import asynccontextmanager
import random
import string
from datetime import datetime
from typing import Optional

from database import db
from models import (
    RegisterRequest, CreateDishRequest, UploadRequest,
    BreatheRequest, TriggerHybridRequest,
    UserResponse, DishResponse, FungusResponse,
    DishDetailResponse, AirResponse, MessageResponse
)
import ai_client


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


@app.post("/heartbeat")
async def heartbeat(user_id: str = Query(..., description="用户ID")):
    """用户心跳 - 更新最后活跃时间"""
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    await db.update_user_last_active(user_id)
    return {"message": "心跳已接收", "user_id": user_id}


@app.get("/online_users")
async def get_online_users(timeout_minutes: int = Query(default=5, description="超时时间（分钟）")):
    """获取在线用户列表"""
    users = await db.get_online_users(timeout_minutes)
    return {"users": users, "count": len(users)}


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
        # 检查培养皿是否已满（10个真菌）
        fungus_count = await db.get_dish_fungus_count(request.dish_id)
        if fungus_count >= 10:
            raise HTTPException(status_code=400, detail="培养皿已满（最多10个真菌）")
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


@app.post("/distribute_air", response_model=MessageResponse)
async def distribute_air(
    dish_id: str = Query(..., description="目标培养皿ID"),
    user_id: str = Query(..., description="用户ID（用于当目标培养皿满时，fallback到库中其他培养皿）")
):
    """分配空气真菌到培养皿（用于空气自动分配机制）

    如果目标培养皿已满，会自动尝试用户库中的其他未满培养皿。
    如果所有培养皿都满，则返回错误。
    """
    dish = await db.get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")

    air_fungi = await db.get_air_fungi()
    if not air_fungi:
        return MessageResponse(message="空气中没有真菌")

    # 检查目标培养皿是否已满
    fungus_count = await db.get_dish_fungus_count(dish_id)
    target_dish_id = dish_id
    target_dish_name = dish["name"]

    if fungus_count >= 10:
        # 目标培养皿已满，尝试用户库中的其他未满培养皿
        available_dish = await db.get_user_available_dish(user_id, exclude_dish_id=dish_id)
        if not available_dish:
            raise HTTPException(
                status_code=400,
                detail="所有培养皿已满（每个培养皿最多10个真菌）"
            )
        target_dish_id = available_dish["dish_id"]
        target_dish_name = available_dish["name"]

    # 随机选择一个真菌分配
    fungus = random.choice(air_fungi)

    # 使用 move_fungus_to_dish 移动真菌
    await db.move_fungus_to_dish(fungus["fungus_id"], target_dish_id)

    # 如果实际分配到了不同的培养皿，在消息中说明
    if target_dish_id != dish_id:
        return MessageResponse(
            message=f"活跃培养皿已满，空气真菌已自动分配到培养皿「{target_dish_name}」",
            data={
                "fungus_id": fungus["fungus_id"],
                "dish_id": target_dish_id,
                "dish_name": target_dish_name,
                "fallback": True
            }
        )

    return MessageResponse(
        message=f"空气真菌已分配到培养皿",
        data={"fungus_id": fungus["fungus_id"], "dish_id": target_dish_id}
    )


@app.get("/check_new_hybrid/{dish_id}")
async def check_new_hybrid(
    dish_id: str,
    after: Optional[str] = Query(default=None, description="查询此时间之后的新杂交事件（ISO格式时间戳）")
):
    """检查培养皿中指定时间之后的新杂交事件"""
    dish = await db.get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")

    events = await db.check_new_hybrid(dish_id, after)
    return {"events": events, "count": len(events)}


@app.post("/trigger_hybrid", response_model=FungusResponse)
async def trigger_hybrid(request: TriggerHybridRequest):
    """触发杂交 - 父母真菌标记为已使用，不再参与后续杂交"""
    fungus1 = await db.get_fungus(request.fungus1_id)
    fungus2 = await db.get_fungus(request.fungus2_id)

    if not fungus1 or not fungus2:
        raise HTTPException(status_code=404, detail="真菌不存在")

    # 检查真菌是否已作为亲本参与过杂交
    if fungus1.get("is_parent"):
        raise HTTPException(status_code=400, detail="真菌1已参与过杂交")
    if fungus2.get("is_parent"):
        raise HTTPException(status_code=400, detail="真菌2已参与过杂交")

    # 标记父母真菌为已使用（不再参与后续杂交）
    await db.mark_fungus_as_parent(fungus1["fungus_id"])
    await db.mark_fungus_as_parent(fungus2["fungus_id"])

    # 调用 AI 生成融合文本
    print(f"[杂交] 开始AI融合: fungus1={fungus1['fungus_id'][:8]}, fungus2={fungus2['fungus_id'][:8]}")
    ai_result = await ai_client.hybrid_text(
        fungus1["content"],
        fungus2["content"]
    )
    print(f"[杂交] AI结果: {ai_result[:100] if ai_result else 'None'}...")

    # 如果 AI 生成失败，使用简单拼接作为 fallback
    hybrid_content = ai_result if ai_result else f"{fungus1['content'][:50]} + {fungus2['content'][:50]}"
    print(f"[杂交] 最终内容: {hybrid_content[:100]}...")

    image_id = generate_image_id()
    dish_id = fungus1.get("dish_id") or fungus2.get("dish_id")

    hybrid_id = await db.create_hybrid_fungus(
        user_id=fungus1["user_id"],
        content=hybrid_content,
        image_id=image_id,
        parent1_id=fungus1["fungus_id"],
        parent2_id=fungus2["fungus_id"],
        dish_id=dish_id
    )

    # 添加杂交事件记录
    await db.add_hybrid_event(dish_id if dish_id else "air", hybrid_id)

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


@app.get("/debug_env")
async def debug_env():
    """调试环境变量"""
    import os
    return {
        "SILICONFLOW_API_KEY": os.getenv("SILICONFLOW_API_KEY", "NOT SET")[:20] + "...",
        "SILICONFLOW_BASE_URL": os.getenv("SILICONFLOW_BASE_URL", "NOT SET"),
        "SILICONFLOW_MODEL": os.getenv("SILICONFLOW_MODEL", "NOT SET"),
        "cwd": os.getcwd()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)