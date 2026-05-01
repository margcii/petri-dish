# Petri Dish 架构文档

## 项目概述

Petri Dish 是一个 AI 媒介艺术实验项目，使用"真菌隐喻"来探索文本的传播与杂交。

### 核心隐喻
- **真菌** = 文本的具象化表征
- **空气** = 公共传播空间
- **培养皿** = 个人接收/处理空间
- **杂交** = AI 参与的文本重组（拼贴诗人方法：碎片拆解+回声+极简连接词）

---

## 技术栈

### 前端
- **框架**: Vite 8 + React 19 + TypeScript
- **样式**: TailwindCSS v4（CSS-first 配置，`@import "tailwindcss"` + `@theme {}`）
- **Canvas**: Fabric.js v7（培养皿真菌渲染，`selectable: false` 避免缩放边框）
- **路由**: React Router DOM v7
- **HTTP 客户端**: Axios（生产环境 baseURL 为空字符串，直接命中同源 FastAPI 端点）

### 后端
- **框架**: FastAPI 0.104 + uvicorn 0.24 + Python 3.11
- **数据库**: SQLite + aiosqlite（异步）
- **AI 服务**: DeepSeek 官方 API（`api.deepseek.com/v1`，模型 `deepseek-chat`）
- **部署**: HuggingFace Spaces Docker SDK 单服务

### 关键约束
- Tailwind v4 不支持 `@apply` 引用自定义类，自定义样式用原生 CSS
- Fabric.js v7 的 `subTargetCheck` 已移除，统一为普通悬浮/点击模式
- Windows 环境用 Anaconda Python（WindowsApps 版无输出）
- 前端生产构建中 `import.meta.env.PROD` 显式判断，避免 Vite 空值解析问题

---

## 部署架构

```
HuggingFace Spaces (Docker SDK)
├── Node 构建阶段 (node:22-slim)
│   └── npm run build → frontend/dist/
└── Python 运行阶段 (python:3.11-slim)
    ├── FastAPI 应用 (api:app)
    │   ├── API 路由 (/register, /upload, /trigger_hybrid, ...)
    │   └── StaticFiles 挂载 (/, html=True) → SPA 兜底
    └── SQLite 数据库 (/data/petri_dish.db)
        └── 需 Storage Bucket 挂载持久化
```

### 环境变量

| 变量 | 开发环境 | 生产环境 (HF Space) | 说明 |
|------|----------|---------------------|------|
| `VITE_API_BASE` | `/api` | `''` (空) | 前端 axios baseURL |
| `PETRI_DB_PATH` | `petri_dish.db` | `/data/petri_dish.db` | SQLite 路径 |
| `PETRI_FRONTEND_DIST` | `../frontend/dist` | `/app/frontend/dist` | 静态文件路径 |
| `DEEPSEEK_API_KEY` | `.env` 文件 | HF Secrets | DeepSeek API 密钥 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | HF Secrets | 注意末尾不能有空格 |
| `PORT` | 8000 | 7860 | HF Spaces 强制端口 |

---

## 交互规则（当前版本）

**统一交互模式（无 Ctrl 区分）**：

| 操作 | 目标 | 效果 |
|------|------|------|
| 悬浮 | 任何真菌/杂交组 | 白色描边高亮 |
| 点击 | 未杂交真菌 | 弹窗：文本框 + 创建者名称 |
| 点击 | 杂交组 | 弹窗：上方杂交结果文本 + 下方子真菌PNG |
| 点击子PNG | 杂交弹窗内子真菌 | 打开子真菌文本详情弹窗 |

---

## 杂交视觉效果

```
两个真菌杂交: [🟦]∩[🟨]  ← 横向平行，重叠50%
三个真菌杂交:   [🟦]
               [🟨][🟥]  ← 品字形重叠50%
```

### 颜色遗传规则

父母真菌颜色通过 `calculate_hybrid_color` 计算：
- 有明确混合规则的颜色对返回预设结果（如 blue+yellow=green）
- 同色父母保留原色
- 不支持的颜色回退到支持列表中的另一个颜色
- 都不支持则随机选择

---

## 数据模型

### 表结构

| 实体 | 关键字段 |
|------|----------|
| **users** | user_id, name, last_active, created_at |
| **dishes** | dish_id, user_id, name, created_at |
| **fungi** | fungus_id, dish_id, user_id, content, image_id, status, location, is_parent, unlock_time, parent1_id, parent2_id, dna_prompt, fall_remaining, created_at |
| **hybrid_events** | event_id, dish_id, fungus_id, created_at |
| **fungus_distributions** | id, fungus_id, user_id, dish_id, created_at |

### 真菌状态
- **idle**: 空闲，可参与杂交
- **incubating**: 孵化中（5秒），不可交互
- **in_air**: 在空气中传播

### 字段说明
- `is_parent` (BOOLEAN DEFAULT 0): 是否已作为亲本参与杂交（杂交后不再参与）
- `dna_prompt` (TEXT): 真菌的DNA提示词（100字上限，影响AI杂交风格）
- `fall_remaining` (INTEGER DEFAULT 3): 空气真菌剩余落入次数（在培养皿中为0，寿命归零自动删除）

---

## API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/register` | POST | 用户注册 |
| `/create_dish` | POST | 创建培养皿 |
| `/upload` | POST | 上传文本生成真菌（可选 dish_id, image_id, dna_prompt） |
| `/get_dish/{dish_id}` | GET | 获取培养皿详情 |
| `/user_dishes/{user_id}` | GET | 获取用户所有培养皿 |
| `/air` | GET | 获取空气中的真菌 |
| `/breathe` | POST | 将空气真菌吸入培养皿 |
| `/distribute_air` | POST | 分配空气真菌（支持fallback） |
| `/trigger_hybrid` | POST | 触发两个真菌杂交 → AI 融合文本 |
| `/check_hybrid/{fungus_id}` | GET | 检查杂交孵化状态 |
| `/check_new_hybrid/{dish_id}` | GET | 检查培养皿新杂交事件 |
| `/heartbeat` | POST | 用户心跳（更新最后活跃时间） |
| `/online_users` | GET | 获取在线用户列表 |
| `/api/info` | GET | 诊断端点（版本信息） |
| `/debug_env` | GET | 调试环境变量 |
| `/health` | GET | 健康检查 |

---

## AI 杂交机制

### 系统提示词（拼贴诗人）

1. 把两段文本各自拆成3-5字的碎片
2. 从两段文本的碎片中挑选，交错排列，用换行、空格控制节奏
3. 同一碎片可重复出现，制造回声
4. 允许极简连接词（的、了、而、却），禁止整句照搬
5. 只能使用给定两段文本中的字词碎片，严禁引入外部词句

### DNA 综合机制

| DNA 情况 | 处理方式 |
|----------|----------|
| 双方都有 DNA | 平均分配双方倾向 |
| 单方有 DNA | 单侧加权 |
| 都无 DNA | 纯基础拼贴 |

---

## 空气真菌分配优先级

```
用户在线:
  空气真菌 → 检查用户活跃培养皿
                ↓
         未满10个? ──Yes──→ 进入活跃培养皿
                ↓ No
         库中随机选择一个未满的培养皿 ──→ 进入

用户离线:
  空气真菌 → 库中随机选择未满培养皿 ──→ 进入
```

---

## 文件结构

```
petri-dish/
├── backend/
│   ├── api.py           # FastAPI 路由 + StaticFiles 挂载
│   ├── database.py      # 数据库操作 (aiosqlite)
│   ├── models.py        # Pydantic 请求/响应模型
│   ├── ai_client.py     # DeepSeek API 客户端
│   ├── schema.sql       # 表结构定义
│   └── .env             # 本地环境变量 (不进入 git)
├── frontend/
│   ├── src/
│   │   ├── api/         # axios 封装 (client.ts)
│   │   ├── components/  # PetriDishCanvas, AirBackground, Modals
│   │   ├── pages/       # Main, DishList, Welcome
│   │   ├── utils/       # fungusHelpers, layout, fungusImage
│   │   └── index.css    # Tailwind v4 全局样式
│   ├── public/          # 静态图片资源
│   ├── .env.development # VITE_API_BASE=/api
│   ├── .env.production  # VITE_API_BASE= (空)
│   └── vite.config.ts   # Vite 配置 + dev proxy
├── Dockerfile           # 多阶段构建
├── .dockerignore
├── README.md            # HF Space frontmatter
└── .claude/
    ├── plan.md
    ├── checkpoints/current.md
    └── doc/architecture.md
```
