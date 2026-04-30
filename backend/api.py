"""
Petri Dish FastAPI 接口
"""

from dotenv import load_dotenv
from pathlib import Path
# 加载环境变量（显式指定 .env 文件路径）
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import random
import string
import uuid
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


__version__ = "0.1.0"


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
    version=__version__,
    lifespan=lifespan
)


def generate_image_id(length: int = 8) -> str:
    """生成随机图片ID"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


# 杂交颜色混合规则表
# 定义两个颜色混合后产生的颜色（基于前端 FUNGUS_COLORS 的 id）
HYBRID_COLOR_RULES = {
    # blue + yellow = green (青色+黄色=绿色)
    ('blue', 'yellow'): 'green',
    ('yellow', 'blue'): 'green',
    # blue + red = purple (青色+红色=紫色)
    ('blue', 'red'): 'purple',
    ('red', 'blue'): 'purple',
    # yellow + red = white (黄色+红色=暖色混合，用white表示)
    ('yellow', 'red'): 'white',
    ('red', 'yellow'): 'white',
    # green + blue = blue (绿色偏青)
    ('green', 'blue'): 'blue',
    ('blue', 'green'): 'blue',
    # green + yellow = yellow (绿色偏黄)
    ('green', 'yellow'): 'yellow',
    ('yellow', 'green'): 'yellow',
    # green + red = yellow (绿色+红色=黄绿)
    ('green', 'red'): 'yellow',
    ('red', 'green'): 'yellow',
    # purple + blue = blue (紫色偏青)
    ('purple', 'blue'): 'blue',
    ('blue', 'purple'): 'blue',
    # purple + red = red (紫色偏红)
    ('purple', 'red'): 'red',
    ('red', 'purple'): 'red',
    # purple + yellow = white (紫色+黄色=灰白)
    ('purple', 'yellow'): 'white',
    ('yellow', 'purple'): 'white',
    # purple + green = blue (紫色+绿色=青色)
    ('purple', 'green'): 'blue',
    ('green', 'purple'): 'blue',
    # white 混合保持原色（白色作为基底）
    ('white', 'blue'): 'blue',
    ('blue', 'white'): 'blue',
    ('white', 'yellow'): 'yellow',
    ('yellow', 'white'): 'yellow',
    ('white', 'green'): 'green',
    ('green', 'white'): 'green',
    ('white', 'purple'): 'purple',
    ('purple', 'white'): 'purple',
    ('white', 'red'): 'red',
    ('red', 'white'): 'red',
}

# 支持的颜色列表
SUPPORTED_COLORS = ['blue', 'yellow', 'green', 'purple', 'white', 'red']


def calculate_hybrid_color(parent1_image_id: str, parent2_image_id: str) -> str:
    """根据父母真菌颜色计算杂交结果颜色

    Args:
        parent1_image_id: 父真菌1的颜色ID
        parent2_image_id: 父真菌2的颜色ID

    Returns:
        杂交结果的颜色ID
    """
    # 查找混合规则
    key = (parent1_image_id, parent2_image_id)
    if key in HYBRID_COLOR_RULES:
        return HYBRID_COLOR_RULES[key]

    # 如果两个父母颜色相同，返回原颜色
    if parent1_image_id == parent2_image_id and parent1_image_id in SUPPORTED_COLORS:
        return parent1_image_id

    # 如果其中一个颜色不在支持列表中，使用另一个颜色
    if parent1_image_id in SUPPORTED_COLORS and parent2_image_id not in SUPPORTED_COLORS:
        return parent1_image_id
    if parent2_image_id in SUPPORTED_COLORS and parent1_image_id not in SUPPORTED_COLORS:
        return parent2_image_id

    # 默认：随机选择一个颜色
    return random.choice(SUPPORTED_COLORS)


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
        location=location,
        dna_prompt=request.dna_prompt
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
    user_id: str = Query(..., description="用户ID（用于过滤已落入的真菌）")
):
    """分配空气真菌到培养皿（多寿命机制）

    1. 获取所有空气真菌（fall_remaining > 0）
    2. 过滤已落入当前用户的真菌
    3. 过滤目标培养皿已满的（>=10个）
    4. 随机选一个符合的空气真菌
    5. 在目标培养皿创建新真菌副本
    6. 记录分配关系
    7. 原真菌 fall_remaining -= 1，若为0则删除
    """
    dish = await db.get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail="培养皿不存在")

    # 检查目标培养皿是否已满
    fungus_count = await db.get_dish_fungus_count(dish_id)
    if fungus_count >= 10:
        raise HTTPException(status_code=400, detail="培养皿已满（最多10个真菌）")

    # 获取所有空气真菌（fall_remaining > 0）
    air_fungi = await db.get_air_fungi()
    available_fungi = [f for f in air_fungi if (f.get("fall_remaining") or 0) > 0]

    if not available_fungi:
        return MessageResponse(message="空气中没有可分配的真菌")

    # 过滤已落入当前用户的
    candidates = []
    for f in available_fungi:
        dist = await db.get_fungus_distributions(f["fungus_id"], user_id)
        if not dist:
            candidates.append(f)

    if not candidates:
        return MessageResponse(message="没有可供你接收的空气真菌")

    # 随机选一个
    fungus = random.choice(candidates)

    # 在目标培养皿创建新真菌副本（新 fungus_id，复制 content/image_id/dna_prompt）
    new_fungus_id = await db.create_fungus(
        user_id=user_id,
        content=fungus["content"],
        image_id=fungus["image_id"],
        dish_id=dish_id,
        status="idle",
        location="dish",
        dna_prompt=fungus.get("dna_prompt")
    )

    # 记录分配关系
    await db.add_fungus_distribution(fungus["fungus_id"], user_id, dish_id)

    # 原真菌 fall_remaining -= 1，若为0则删除
    await db.decrement_fall_remaining(fungus["fungus_id"])

    new_fungus = await db.get_fungus(new_fungus_id)
    return MessageResponse(
        message="空气真菌已落入培养皿",
        data={"fungus": dict(new_fungus)} if new_fungus else {}
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
        fungus2["content"],
        dna_prompt1=fungus1.get("dna_prompt"),
        dna_prompt2=fungus2.get("dna_prompt")
    )
    print(f"[杂交] AI结果: {ai_result[:100] if ai_result else 'None'}...")

    # 如果 AI 生成失败，使用简单拼接作为 fallback
    hybrid_content = ai_result if ai_result else f"{fungus1['content'][:50]} + {fungus2['content'][:50]}"
    print(f"[杂交] 最终内容: {hybrid_content[:100]}...")

    # 根据父母真菌颜色计算杂交结果颜色
    image_id = calculate_hybrid_color(fungus1["image_id"], fungus2["image_id"])
    print(f"[杂交] 父母颜色: {fungus1['image_id']} + {fungus2['image_id']} -> 结果: {image_id}")

    dish_id = fungus1.get("dish_id") or fungus2.get("dish_id")

    hybrid_id = await db.create_hybrid_fungus(
        user_id=fungus1["user_id"],
        content=hybrid_content,
        image_id=image_id,
        parent1_id=fungus1["fungus_id"],
        parent2_id=fungus2["fungus_id"],
        dish_id=dish_id
    )

    # 添加杂交事件记录（仅培养皿内杂交需要记录）
    if dish_id:
        await db.add_hybrid_event(dish_id, hybrid_id)

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


# ==================== 临时清理 ====================

@app.post("/admin/clear_air")
async def clear_air():
    """临时：删除所有空气真菌（测试数据清理）"""
    count = await db.clear_air()
    return {"message": f"已删除 {count} 个空气真菌"}


# ==================== 健康检查 ====================

@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


@app.get("/api/info")
async def api_info():
    """诊断端点 - 暴露运行版本"""
    return {"message": "Petri Dish API 正在运行", "version": __version__}


@app.get("/debug_env")
async def debug_env():
    """调试环境变量"""
    return {
        "DEEPSEEK_API_KEY": os.getenv("DEEPSEEK_API_KEY", "NOT SET")[:20] + "...",
        "DEEPSEEK_BASE_URL": os.getenv("DEEPSEEK_BASE_URL", "NOT SET"),
        "DEEPSEEK_MODEL": os.getenv("DEEPSEEK_MODEL", "NOT SET"),
        "cwd": os.getcwd()
    }


# ==================== 静态前端 ====================
# 注意:必须在所有 @app.xxx 路由声明之后,才不会"吃掉"具名 API 端点
_frontend_dist = os.getenv(
    "PETRI_FRONTEND_DIST",
    str(Path(__file__).parent.parent / "frontend" / "dist")
)
if Path(_frontend_dist).exists():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="static")
    print(f"Static frontend mounted: {_frontend_dist}")
else:
    print(f"Warning: frontend dist not found at {_frontend_dist}, skipping mount")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)