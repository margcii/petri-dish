# Petri Dish 架构文档

## 项目概述

Petri Dish 是一个 AI 媒介艺术实验项目，使用"真菌隐喻"来探索文本的传播与杂交。

### 核心隐喻
- **真菌** = 文本的具象化表征
- **空气** = 公共传播空间
- **培养皿** = 个人接收/处理空间
- **杂交** = AI 参与的文本重组

---

## 技术栈

### 前端
- **框架**: Vite + React 18 + TypeScript
- **样式**: TailwindCSS
- **路由**: React Router DOM
- **HTTP 客户端**: Axios

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLite + aiosqlite (异步)
- **AI 服务**: SiliconFlow API (DeepSeek-V3.2)
- **部署**: Zeabur (后端) + Vercel (前端)

---

## AI 配置 (CP3)

### SiliconFlow API

| 配置项 | 值 |
|--------|-----|
| **服务商** | SiliconFlow (硅基流动) |
| **Base URL** | `https://api.siliconflow.cn/v1` |
| **模型** | `deepseek-ai/DeepSeek-V3.2` |
| **API Key** | `sk-tuuvgnhjgqwaddqwlulezujscwokelwvtxpwlukkpqzfkacr` |
| **文档** | https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions |

### 环境变量
```bash
# backend/.env
SILICONFLOW_API_KEY=sk-tuuvgnhjgqwaddqwlulezujscwokelwvtxpwlukkpqzfkacr
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3.2
```

### 依赖
```bash
pip install openai  # SiliconFlow API 兼容 OpenAI SDK
```

### 使用示例
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://api.siliconflow.cn/v1",
    api_key="sk-tuuvgnhjgqwaddqwlulezujscwokelwvtxpwlukkpqzfkacr"
)

response = await client.chat.completions.create(
    model="deepseek-ai/DeepSeek-V3.2",
    messages=[
        {"role": "system", "content": "你是一个创意文本融合助手..."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.7,
    max_tokens=500
)
```

---

## 数据模型

### 用户 (User)
```typescript
{
  user_id: string      // UUID
  name: string         // 显示名称
  created_at: string   // ISO 时间戳
  last_active: string  // 最后活跃时间
}
```

### 培养皿 (Dish)
```typescript
{
  dish_id: string      // UUID
  user_id: string      // 所属用户
  name: string         // 培养皿名称
  created_at: string
  fungus_count: number // 真菌数量（计算字段）
}
```

### 真菌 (Fungus)
```typescript
{
  fungus_id: string    // UUID
  user_id: string      // 创建者
  dish_id: string|null // 所在培养皿
  content: string      // 文本内容（最多500字）
  image_id: string     // 外观标识（颜色/样式）
  status: 'idle' | 'incubating' | 'in_air'
  location: 'dish' | 'air'
  is_parent: boolean   // 是否已参与杂交
  parent1_id: string|null  // 杂交父本1
  parent2_id: string|null  // 杂交父本2
  unlock_time: string|null  // 孵化完成时间
  created_at: string
}
```

---

## API 端点

### 用户
- `POST /register` - 用户注册
- `GET /user/{user_id}` - 获取用户信息
- `POST /heartbeat?user_id=xxx` - 心跳（在线状态）
- `GET /online_users` - 获取在线用户

### 培养皿
- `POST /create_dish` - 创建培养皿
- `GET /get_dish/{dish_id}` - 获取培养皿详情
- `GET /user_dishes/{user_id}` - 获取用户的所有培养皿

### 真菌
- `POST /upload` - 上传文本创建真菌
- `GET /air` - 获取空气中的真菌
- `POST /breathe` - 将空气真菌吸入培养皿
- `POST /distribute_air` - 分配空气真菌（支持自动 fallback）
- `POST /trigger_hybrid` - 触发两个真菌杂交
- `GET /check_hybrid/{fungus_id}` - 检查杂交状态
- `GET /check_new_hybrid/{dish_id}` - 检查新杂交事件

---

## 核心交互流程

### 1. 创建真菌 → 放入培养皿
```
用户输入文本 → 选择样式 → 点击"放入活跃培养皿"
→ POST /upload (dish_id) → 刷新培养皿显示
```

### 2. 发射到空气
```
用户输入文本 → 点击"🚀 发射"
→ POST /upload (无 dish_id) → status=in_air
→ 空气区 5 秒轮询刷新显示
```

### 3. 从空气吸入
```
点击"放入培养皿" → 点击"🌬️ 从空气吸入真菌"
→ POST /distribute_air → 真菌从空气移动到培养皿
→ 如果活跃培养皿已满，自动 fallback 到库中其他未满培养皿
```

### 4. 自动杂交 (CP2.7)
```
每 5 秒检测 → 查找 idle 状态真菌（排除已参与杂交的）
→ 如果有 ≥2 个 → 随机选 2 个触发杂交
→ 标记父母为 is_parent=true（隐藏显示）
→ 创建 incubating 状态杂交真菌
→ 5 秒后孵化完成 → status=idle
```

### 5. AI 杂交文本生成 (CP3)
```
trigger_hybrid 调用时 → 获取父母文本 content1, content2
→ 调用 SiliconFlow API 生成融合文本
→ 使用 Prompt: "融合以下两个概念..."
→ 保存生成的文本到新真菌
→ API 失败时 fallback 为简单拼接
```

---

## 数据库表结构

```sql
-- 用户表
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 培养皿表
CREATE TABLE dishes (
    dish_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 真菌表
CREATE TABLE fungi (
    fungus_id TEXT PRIMARY KEY,
    dish_id TEXT,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_id TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    location TEXT DEFAULT 'air',
    is_parent BOOLEAN DEFAULT 0,
    unlock_time TIMESTAMP,
    parent1_id TEXT,
    parent2_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(dish_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 杂交事件表
CREATE TABLE hybrid_events (
    event_id TEXT PRIMARY KEY,
    dish_id TEXT NOT NULL,
    fungus_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(dish_id),
    FOREIGN KEY (fungus_id) REFERENCES fungi(fungus_id)
);
```

---

## 状态管理

### 前端状态
- **用户**: localStorage (`petriDishUser`)
- **活跃培养皿**: localStorage (`activeDishId`)
- **组件状态**: React useState

### 后端状态
- **在线状态**: 基于 `/heartbeat` 最后活跃时间（5分钟超时）
- **真菌状态**: 数据库 status 字段

---

## 文件结构

```
petri-dish/
├── backend/
│   ├── api.py           # FastAPI 路由
│   ├── database.py      # 数据库操作
│   ├── models.py        # Pydantic 模型
│   ├── run.py           # 启动脚本
│   └── ai_client.py     # SiliconFlow API 客户端 (CP3)
├── frontend/
│   ├── src/
│   │   ├── api/         # API 调用封装
│   │   ├── pages/       # 页面组件
│   │   └── App.tsx      # 路由配置
│   └── index.html
├── doc/
│   └── architecture.md  # 本文档
└── .claude/
    ├── CLAUDE.md        # Claude 配置
    └── checkpoints/
        └── current.md   # 检查点计划
```

---

## 部署

### 后端 (Zeabur)
```bash
# 环境变量
SILICONFLOW_API_KEY=xxx
DATABASE_URL=sqlite:///./petri_dish.db
```

### 前端 (Vercel)
```bash
# 构建命令
npm run build

# 输出目录
dist
```
