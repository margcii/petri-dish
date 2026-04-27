# ============ 阶段 1: 构建前端 ============
FROM node:22-slim AS frontend-builder

WORKDIR /build/frontend

# 先复制 package.json 单独 npm install,利用 Docker 层缓存
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund

# 复制源码并构建(.env.production 决定 VITE_API_BASE=空)
COPY frontend/ ./
RUN npm run build


# ============ 阶段 2: 后端运行镜像 ============
FROM python:3.11-slim AS runtime

WORKDIR /app

# 系统依赖最小化 — python:3.11-slim 已包含运行所需的一切

# Python 依赖
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# 后端代码
COPY backend/ /app/backend/

# 从前端构建阶段拷贝静态产物到 /app/frontend/dist
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

# 数据目录 — HF Storage Bucket 会挂载到 /data
RUN mkdir -p /data

# 运行时环境
ENV PETRI_DB_PATH=/data/petri_dish.db
ENV PETRI_FRONTEND_DIST=/app/frontend/dist
ENV PORT=7860
# DEEPSEEK_API_KEY 由 HF Secrets 在运行时注入

EXPOSE 7860

WORKDIR /app/backend

# uvicorn 监听 0.0.0.0:7860,reload 关闭(生产)
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
