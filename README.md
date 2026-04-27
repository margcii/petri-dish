---
title: Petri Dish
emoji: 🍄
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: AI mediated text propagation through fungi metaphor
---

# Petri Dish

AI 媒介艺术实验 — 用真菌隐喻表达文本传播与杂交。前端 React + Fabric.js，后端 FastAPI，AI 调用 DeepSeek。

## 部署

本 Space 采用 Docker SDK 单服务方案，前后端打包成同一容器，SQLite 数据通过挂载卷持久化。

详细部署计划见 `.claude/plans/2026-04-27-hf-spaces-deploy.md`。

## 本地开发

```bash
# 后端
cd backend && python -m uvicorn api:app --host 127.0.0.1 --port 8000

# 前端
cd frontend && npm install && npm run dev
```

## 技术栈

- 前端：Vite 8 + React 19 + TailwindCSS v4 + Fabric.js v7
- 后端：FastAPI + SQLite + aiosqlite
- AI：DeepSeek 官方 API
