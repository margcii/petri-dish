youxian1# Petri Dish - 3day 计划

**日期：** 2026年3月13日 - 2026年3月15日  
**阶段：** Week 1 核心功能开发

---

## 审查点

### Day 1 审查（数据库基础架构完成时）
- [ ] 核对数据库表结构是否与项目架构一致
  - [ ] users 表：user_id, name, created_at
  - [ ] dishes 表：dish_id, user_id, name, created_at
  - [ ] fungi 表：fungus_id, text, image_id, creator_id, parent_ids, status, location, unlock_time, created_at
- [ ] 核对 status 字段类型是否为枚举（idle / incubating / in_air）
- [ ] 核对 location 字段设计（air / dish_id）
- [ ] 核对异步连接池是否配置正确

### Day 2 审查（FastAPI 接口开发完成时）
- [ ] 核对 API 端点是否齐备
  - [ ] /register (POST)
  - [ ] /create_dish (POST)
  - [ ] /upload (POST)
  - [ ] /get_dish (GET)
  - [ ] /breathe (POST)
  - [ ] /trigger_hybrid (POST)
- [ ] 核对每个接口的请求参数与响应格式
- [ ] 核对随机图片分配功能是否实现
- [ ] 核对 DeepSeek API 调用是否正确
- [ ] 使用 Postman 测试：上传文本是否返回随机图片 ID

### Day 3 审查（前端基础架构完成时）
- [ ] 核对前端页面结构完整性
  - [ ] 用户注册/创建培养皿表单
  - [ ] 培养皿状态显示区域
  - [ ] 真菌渲染逻辑
- [ ] 核对前端是否实现轮询机制（5秒间隔）
- [ ] 核对杂交倒计时显示（60秒）
- [ ] 核对鼠标悬停查看文本功能

### Checkpoint 1 审查（Week 1 结束时）
- [ ] 能用 Postman 上传文本并看到随机图片 ID
- [ ] 数据库正确记录 in_air / in_dish 状态
- [ ] 整体效果是否满足真实需求

---

## 项目定位

**AI媒介艺术实验 - 以真菌隐喻文本传播与杂交**

> **参考项目灵感：**
> - **Gantry / Neural Dialogue** - AI 对话生成与传播
> - **AI Poetry Generators** - 文本生成与视觉化
> - **Slow Art / Eternal Return** - 慢速观察类交互
> - **DeepSeek API 文档** - 文本杂交实现

---

## 3-Day Plan

### Day 1: 数据库基础架构（3月14日）

#### 目标
完成 SQLite 数据库表结构设计与实现，为后续接口开发奠定基础。

#### 任务清单

| 任务 | 优先级 | 参考资料 |
|------|--------|----------|
| 创建 SQLite 表结构（users, dishes, fungi） | 高 | [schema.sql](file://d:\work\Engineering\projects\petri%20dish\backend\schema.sql) |
| 实现数据库连接池 | 高 | SQLAlchemy async 文档 |
| 编写数据库初始化脚本 | 中 | aiopath 文档 |
| 编写单元测试 | 低 | pytest-asyncio |

#### 技术要点

**数据库模型关系：**
```
User (1) ←→ (N) Dish
User (1) ←→ (N) Fungus
Dish (1) ←→ (N) Fungus
```

**关键字段设计：**
- `fungus.status`: `idle` / `incubating` / `in_air`
- `fungus.location`: `air` / `dish_id` (当 status=in_air 时为 air，否则为具体 dish_id)
- `fungus.unlock_time`: Unix 时间戳（用于孵化倒计时）

#### 参考实现

**FastAPI + SQLAlchemy 异步连接示例：**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    "sqlite+aiosqlite:///./petri_dish.db",
    echo=True
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

---

### Day 2: FastAPI 接口开发（3月15日）

#### 目标
完成核心 API 端点开发，实现基本的数据流转逻辑。

#### 任务清单

| 端点 | 方法 | 优先级 | 测试工具 |
|------|------|--------|----------|
| /register | POST | 高 | Postman |
| /create_dish | POST | 高 | Postman |
| /upload | POST | 高 | Postman |
| /get_dish | GET | 高 | Postman |
| /breathe | POST | 中 | Postman |
| /trigger_hybrid | POST | 中 | Postman |

#### 技术要点

**Pydantic 模型验证：**
```python
from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str

class FungusCreate(BaseModel):
    text: str
    user_id: int
    location: str  # "air" or dish_id
```

**随机图片分配逻辑：**
```python
import random

def assign_random_image_id():
    return f"{random.randint(1, N):02d}"
```

**杂交逻辑（调用 DeepSeek API）：**
```python
import httpx

async def call_deepseek_api(text1: str, text2: str) -> str:
    prompt = f"请将以下两段文本进行杂交重组，生成一段新的文本：\n\n文本1：{text1}\n\n文本2：{text2}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        return response.json()["choices"][0]["message"]["content"]
```

---

### Day 3: 前端基础架构（3月16日）

#### 目标
完成前端页面结构与基础交互，实现与后端的通信。

#### 任务清单

| 功能 | 优先级 | 参考资料 |
|------|--------|----------|
| 创建基础 HTML 结构 | 高 | - |
| 实现 CSS 样式框架 | 高 | - |
| 实现用户注册/创建培养皿表单 | 高 | - |
| 实现文本上传功能 | 高 | Fetch API |
| 实现培养皿状态显示 | 中 | - |
| 实现真菌渲染逻辑 | 中 | - |

#### 技术要点

**前端架构：**
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- 用户区域 -->
    <div id="user-panel">...</div>
    
    <!-- 培养皿区域 -->
    <div id="dish-container">...</div>
    
    <!-- 文本详情弹窗 -->
    <div id="fungus-tooltip">...</div>
    
    <script src="app.js"></script>
</body>
</html>
```

**轮询机制（每 5 秒）：**
```javascript
async function pollDishStatus() {
    const response = await fetch('/get_dish?dish_id=123');
    const data = await response.json();
    renderFungi(data.fungi);
    setTimeout(pollDishStatus, 5000); // 5秒后再次轮询
}

// 启动轮询
pollDishStatus();
```

**定时器倒计时（杂交孵化）：**
```javascript
function updateHybridTimer(fungus) {
    const now = Date.now() / 1000;
    const remaining = Math.max(0, fungus.unlock_time - now);
    
    if (remaining === 0) {
        fungus.status = 'idle';
    } else {
        // 更新倒计时显示
        fungus.hybrid_timer = Math.ceil(remaining);
    }
}

// 每秒更新一次
setInterval(() => {
    fungi.forEach(updateHybridTimer);
    renderFungi(fungi);
}, 1000);
```

---

## 后续检查点（Week 1）

### Checkpoint 1 (完成 Day 1-3 后)
- [ ] 能用 Postman 上传文本并看到随机图片 ID
- [ ] 数据库正确记录 in_air / in_dish 状态

### Checkpoint 2 (Week 2 开始前)
- [ ] 前端页面不刷新，真菌自动出现
- [ ] 杂交时有 60 秒倒计时，归零后变新真菌
- [ ] 鼠标悬停可查看文本

---

## 技术参考资料

| 主题 | 资源链接 |
|------|----------|
| FastAPI 官方文档 | https://fastapi.tiangolo.com/ |
| SQLAlchemy 异步 | https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html |
| Pydantic v2 | https://docs.pydantic.dev/latest/ |
| DeepSeek API | https://api-docs.deepseek.com/ |
| SQLite 文档 | https://www.sqlite.org/docs.html |

---

## 风险与注意事项

1. **DeepSeek API 速率限制**：注意控制请求频率
2. **数据库并发**：使用异步连接池处理多用户访问
3. **资源清理**：定期清理过期的 in_air 真菌记录
4. **前端缓存**：考虑使用 localStorage 优化用户体验