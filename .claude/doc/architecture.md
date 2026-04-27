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
- **样式**: TailwindCSS v4（CSS-first 配置，`@import "tailwindcss"` + `@theme {}`）
- **Canvas**: Fabric.js v7（培养皿真菌渲染）
- **路由**: React Router DOM
- **HTTP 客户端**: Axios

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLite + aiosqlite (异步)
- **AI 服务**: DeepSeek 官方 API（`api.deepseek.com/v1`，模型 `deepseek-chat`）
- **部署**: HuggingFace Spaces Docker SDK 单服务(详见 `.claude/plans/2026-04-27-hf-spaces-deploy.md`)

### 关键约束
- Tailwind v4 不支持 `@apply` 引用自定义类，自定义样式用原生 CSS
- Fabric.js v7 的 `subTargetCheck` 用于子对象穿透（已移除，统一为普通模式）
- Windows 环境用 Anaconda Python

---

## 交互规则（当前版本）

**统一交互模式（无 Ctrl 区分）**：

| 操作 | 目标 | 效果 |
|------|------|------|
| 悬浮 | 任何真菌/杂交组 | 白色描边高亮 |
| 点击 | 未杂交真菌 | 弹窗：文本框 + 创建者ID |
| 点击 | 杂交组 | 弹窗：上方杂交结果文本 + 下方子真菌PNG |
| 点击子PNG | 杂交弹窗内子真菌 | 打开子真菌文本详情弹窗 |

---

## 杂交视觉效果

```
两个真菌杂交: [🟦]∩[🟨]  ← 横向平行，重叠50%
三个真菌杂交:   [🟦]
               [🟨][🟥]  ← 品字形重叠50%
```

---

## 数据模型

| 实体 | 字段 |
|------|------|
| **User** | user_id, name, created_at |
| **Dish** | dish_id, user_id, name, created_at |
| **Fungus** | fungus_id, text, image_id, creator_id, parent_ids, status(idle/incubating/in_air), location(air/dish_id), unlock_time, created_at |

### 状态说明
- **idle**: 空闲，可参与杂交
- **incubating**: 孵化中（5秒），不可交互
- **in_air**: 在空气中传播

---

## API端点

| 端点 | 方法 | 功能 |
|------|------|------|
| /register | POST | 用户注册 |
| /create_dish | POST | 创建培养皿 |
| /upload | POST | 上传文本生成真菌 |
| /get_dish/{dish_id} | GET | 获取培养皿详情 |
| /user_dishes/{user_id} | GET | 获取用户所有培养皿 |
| /air | GET | 获取空气中的真菌 |
| /breathe | POST | 将空气真菌吸入培养皿 |
| /distribute_air | POST | 分配空气真菌（支持fallback） |
| /trigger_hybrid | POST | 触发两个真菌杂交 |
| /check_hybrid/{fungus_id} | GET | 检查杂交孵化状态 |
| /check_new_hybrid/{dish_id} | GET | 检查新杂交事件 |
| /heartbeat | POST | 用户心跳 |
| /online_users | GET | 获取在线用户 |

---

## AI 配置

| 配置项 | 值 |
|--------|-----|
| 服务商 | DeepSeek 官方 |
| Base URL | `https://api.deepseek.com/v1` |
| 模型 | `deepseek-chat` |
| API Key | `sk-494f301ab3544598b8964b7841991f20` |

环境变量（`backend/.env`）：
```
DEEPSEEK_API_KEY=sk-494f301ab3544598b8964b7841991f20
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

---

## 文件结构

```
petri-dish/
├── backend/
│   ├── api.py           # FastAPI 路由
│   ├── database.py      # 数据库操作
│   ├── models.py        # Pydantic 模型
│   ├── ai_client.py     # DeepSeek API 客户端
│   ├── run.py           # 启动脚本
│   └── .env             # 环境变量
├── frontend/
│   ├── src/
│   │   ├── api/         # API 调用封装
│   │   ├── components/  # 组件
│   │   │   ├── PetriDishCanvas.tsx  # Fabric.js 培养皿画布
│   │   │   ├── AirBackground.tsx    # 空气漂浮背景
│   │   │   ├── FungusDetailModal.tsx    # 真菌详情弹窗
│   │   │   └── HybridGroupDetailModal.tsx # 杂交组详情弹窗
│   │   ├── pages/
│   │   │   ├── Main.tsx     # 主界面
│   │   │   └── DishList.tsx # 库页面
│   │   ├── utils/
│   │   │   ├── fungusHelpers.ts # 真菌分组逻辑
│   │   │   ├── fungusImage.ts   # 真菌图片加载
│   │   │   └── layout.ts       # 培养皿布局算法
│   │   └── index.css      # 全局样式（Tailwind v4）
│   └── public/            # 静态资源（layer4-11.png, petridish.png）
└── .claude/
    ├── CLAUDE.md
    ├── settings.local.json
    ├── doc/architecture.md
    ├── checkpoints/current.md
    └── skills/petri-dish-context/SKILL.md
```

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