# HuggingFace Spaces 单服务部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Petri Dish 部署到 HuggingFace Spaces (Docker SDK),前后端打包成单一容器,SQLite 数据通过 Storage Bucket 持久化,无需绑卡或实名,1-3 天内可访问。

**Architecture:** 多阶段 Docker 构建 — Node 阶段构建 React 静态产物,Python 阶段安装 FastAPI 依赖并把 `frontend/dist/` 打入镜像。FastAPI 同时承担 API(根路径未占用的端点) + 静态前端服务(StaticFiles 挂载到根路径,html=True 兜底)。前端通过 `VITE_API_BASE` 环境变量在开发期(`/api` + vite proxy rewrite)与生产期(空 baseURL,直接打 FastAPI 端点)间切换,后端无需路由前缀重构。SQLite 数据库路径由 `PETRI_DB_PATH` 环境变量控制,在 HF Spaces 中指向 Storage Bucket 挂载点。DeepSeek key 进 HF Repository Secrets,不入 git。

**Tech Stack:**
- 后端:FastAPI 0.104 + uvicorn 0.24 + aiosqlite 0.19 + Python 3.11
- 前端:Vite 8 + React 19 + Tailwind v4 + Fabric 7
- 容器:Docker 多阶段(`node:20-slim` 构建 → `python:3.11-slim` 运行)
- 平台:HuggingFace Spaces Docker SDK + Storage Bucket
- 端口约定:HF Spaces 强制容器监听 7860

---

## File Structure

**新建文件:**
- `Dockerfile` — 多阶段镜像定义(项目根)
- `.dockerignore` — 排除 node_modules、本地 db、worktree 等
- `frontend/.env.development` — 开发期 `VITE_API_BASE=/api`
- `frontend/.env.production` — 生产构建 `VITE_API_BASE=`(空)
- `README.md` — HF Space 元数据 frontmatter(Space 仓库根需要)
- `backend/tests/test_db_path_env.py` — 数据库路径参数化测试
- `backend/tests/test_static_mount.py` — StaticFiles 挂载测试
- `backend/tests/__init__.py` — 测试包标识(若不存在)

**修改文件:**
- `backend/database.py` — `Database.__init__` 默认从 `PETRI_DB_PATH` 读路径
- `backend/api.py` — 删除 `root()`、添加 `StaticFiles` 挂载
- `frontend/src/api/client.ts` — `baseURL` 改读 `import.meta.env.VITE_API_BASE`

**保持不变:**
- `frontend/vite.config.ts`(开发 proxy 已正确)
- `backend/schema.sql`、`backend/models.py`、`backend/ai_client.py`
- 业务路由、前端组件代码

---

## Pre-flight Checks

部署前确认环境就绪。

- [ ] **Step P1: 确认 Anaconda Python 与依赖**

Run: `D:/software/programming/Anaconda3/python.exe -c "import fastapi, aiosqlite; print(fastapi.__version__, aiosqlite.__version__)"`
Expected: `0.104.1 0.19.0` 或更新

- [ ] **Step P2: 确认前端可干净构建**

Run: `cd frontend && D:/software/programming/node/npm.cmd run build`
Expected: 退出码 0,生成 `frontend/dist/index.html` 和 assets

- [ ] **Step P3: 确认 Docker 可用**

Run: `docker --version`
Expected: `Docker version 2x.x.x`(任意现代版本)

如果 Docker 未安装,先装 Docker Desktop,再继续后续 Task。

- [ ] **Step P4: 备份当前 SQLite 数据**

Run: `cp backend/petri_dish.db backend/petri_dish.db.backup-$(date +%Y%m%d)`
Expected: 备份文件存在(避免后续测试覆盖现有数据)

---

## Task 1: 数据库路径参数化

让 `Database` 默认从 `PETRI_DB_PATH` 环境变量读路径,本地不设环境变量时仍走 `petri_dish.db`(向后兼容)。

**Files:**
- Modify: `backend/database.py:19-21`(`__init__` 签名)
- Test: `backend/tests/test_db_path_env.py`(新建)
- Create: `backend/tests/__init__.py`(若不存在)

- [ ] **Step 1.1: 创建测试包标识**

Run: `ls backend/tests/__init__.py 2>/dev/null || touch backend/tests/__init__.py`
Expected: 文件存在(空文件即可)

- [ ] **Step 1.2: 写失败测试**

Create `backend/tests/test_db_path_env.py`:

```python
"""Database 路径环境变量测试"""
import os
import importlib
import pytest


def test_default_path_when_env_unset(monkeypatch):
    monkeypatch.delenv("PETRI_DB_PATH", raising=False)
    import database
    importlib.reload(database)
    assert database.db.db_path == "petri_dish.db"


def test_path_from_env(monkeypatch, tmp_path):
    custom_path = str(tmp_path / "custom.db")
    monkeypatch.setenv("PETRI_DB_PATH", custom_path)
    import database
    importlib.reload(database)
    assert database.db.db_path == custom_path


def test_explicit_path_overrides_env(monkeypatch):
    monkeypatch.setenv("PETRI_DB_PATH", "/should/not/use.db")
    import database
    importlib.reload(database)
    explicit = database.Database(db_path="explicit.db")
    assert explicit.db_path == "explicit.db"
```

- [ ] **Step 1.3: 运行测试确认失败**

Run: `cd backend && D:/software/programming/Anaconda3/python.exe -m pytest tests/test_db_path_env.py -v`
Expected: `test_path_from_env` FAIL(当前 `__init__` 不读环境变量,依然返回 `petri_dish.db`)

- [ ] **Step 1.4: 修改 database.py**

Edit `backend/database.py`,把:

```python
class Database:
    """异步数据库操作类"""
    
    def __init__(self, db_path: str = "petri_dish.db"):
        self.db_path = db_path
        self._db: Optional[aiosqlite.Connection] = None
```

改成:

```python
class Database:
    """异步数据库操作类"""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("PETRI_DB_PATH", "petri_dish.db")
        self._db: Optional[aiosqlite.Connection] = None
```

- [ ] **Step 1.5: 运行测试确认通过**

Run: `cd backend && D:/software/programming/Anaconda3/python.exe -m pytest tests/test_db_path_env.py -v`
Expected: 3 passed

- [ ] **Step 1.6: 提交**

```bash
git add backend/database.py backend/tests/__init__.py backend/tests/test_db_path_env.py
git commit -m "feat(db): parametrize db_path via PETRI_DB_PATH env var"
```

---

## Task 2: 后端挂载静态前端

让 FastAPI 同时服务 `frontend/dist/`。利用 FastAPI 的特性:显式装饰器路由(`/register`、`/health` 等)优先匹配,`StaticFiles` mount 在 `/` 兜底未匹配的请求,返回 `index.html`。

**冲突处理:** 当前 `api.py` 有一个 `@app.get("/")` 的 `root()` 函数返回 JSON 占位信息 — 必须删除或改路径,否则会和 StaticFiles 抢根路径。我们改名 `/api/info` 保留同样信息以便诊断。

**Files:**
- Modify: `backend/api.py:439-442`(删除 `root()`)
- Modify: `backend/api.py:445-449`(在 `health()` 后添加新的 `info` 端点 + StaticFiles 挂载)
- Test: `backend/tests/test_static_mount.py`(新建)

- [ ] **Step 2.1: 写失败测试**

Create `backend/tests/test_static_mount.py`:

```python
"""StaticFiles 挂载与路由优先级测试"""
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    # 准备假的 frontend/dist
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text("<html><body>petri</body></html>")
    (dist_dir / "favicon.ico").write_bytes(b"\x00\x00")

    # 让 api.py 知道去哪儿找静态产物
    monkeypatch.setenv("PETRI_FRONTEND_DIST", str(dist_dir))
    monkeypatch.setenv("PETRI_DB_PATH", str(tmp_path / "test.db"))

    import importlib
    import api
    importlib.reload(api)
    return TestClient(api.app)


def test_root_serves_index_html(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "petri" in resp.text


def test_health_still_returns_json(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy"}


def test_api_info_returns_version(client):
    resp = client.get("/api/info")
    assert resp.status_code == 200
    assert resp.json()["version"] == "0.1.0"


def test_static_asset_served(client):
    resp = client.get("/favicon.ico")
    assert resp.status_code == 200
    assert resp.content == b"\x00\x00"
```

- [ ] **Step 2.2: 运行测试确认失败**

Run: `cd backend && D:/software/programming/Anaconda3/python.exe -m pytest tests/test_static_mount.py -v`
Expected: `test_root_serves_index_html` 和 `test_api_info_returns_version` FAIL

- [ ] **Step 2.3: 修改 api.py — 删除旧 root**

Edit `backend/api.py`,删除以下整段(在 `# ==================== 健康检查 ====================` 下):

```python
@app.get("/")
async def root():
    """根路径"""
    return {"message": "Petri Dish API 正在运行", "version": "0.1.0"}
```

- [ ] **Step 2.4: 修改 api.py — 添加 /api/info 端点**

在 `health()` 函数定义之后(原 `debug_env` 之前)添加:

```python
@app.get("/api/info")
async def api_info():
    """诊断端点 - 暴露运行版本"""
    return {"message": "Petri Dish API 正在运行", "version": "0.1.0"}
```

- [ ] **Step 2.5: 修改 api.py — 添加 StaticFiles 挂载**

在 `api.py` 顶部 imports 区域添加:

```python
from fastapi.staticfiles import StaticFiles
from pathlib import Path
```

在文件最末尾(`if __name__ == "__main__":` 之前)添加:

```python
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
```

注意 `import os` 已存在(`debug_env` 用过),无需再加。

- [ ] **Step 2.6: 运行测试确认通过**

Run: `cd backend && D:/software/programming/Anaconda3/python.exe -m pytest tests/test_static_mount.py -v`
Expected: 4 passed

- [ ] **Step 2.7: 跑全量后端测试确认无回归**

Run: `cd backend && D:/software/programming/Anaconda3/python.exe -m pytest -v`
Expected: 所有测试通过(包括之前的 test_ai_client.py、test_hybrid_api.py 若存在)

- [ ] **Step 2.8: 提交**

```bash
git add backend/api.py backend/tests/test_static_mount.py
git commit -m "feat(api): mount static frontend, move root to /api/info"
```

---

## Task 3: 前端 baseURL 环境变量化

让 axios `baseURL` 在开发期保留 `/api`(走 vite proxy rewrite,后端无前缀),生产期切到空 baseURL(直接打同源 FastAPI 端点)。

**Files:**
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/.env.development`
- Create: `frontend/.env.production`

- [ ] **Step 3.1: 创建 .env.development**

Create `frontend/.env.development`:

```
VITE_API_BASE=/api
```

- [ ] **Step 3.2: 创建 .env.production**

Create `frontend/.env.production`:

```
VITE_API_BASE=
```

(等号后留空 — 生产期 baseURL 为空字符串,axios 把请求发到当前 origin 根路径,直接命中 FastAPI 路由)

- [ ] **Step 3.3: 修改 client.ts**

Edit `frontend/src/api/client.ts`,把:

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export default client
```

改成:

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 10000,
})

export default client
```

注意用 `??` 而非 `||`,因为 `VITE_API_BASE=`(空字符串)是合法值,不能被 fallback 兜底。

- [ ] **Step 3.4: 验证开发模式仍正常**

Terminal 1:
```bash
cd backend && D:/software/programming/Anaconda3/python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Terminal 2:
```bash
cd frontend && D:/software/programming/node/npm.cmd run dev
```

打开浏览器 `http://localhost:3000`,DevTools Network 应看到请求打到 `/api/register` 等,后端日志显示 `POST /register 200`。

Expected: 注册新用户、创建培养皿、上传真菌全流程正常。

- [ ] **Step 3.5: 验证生产构建生成正确 baseURL**

Run: `cd frontend && D:/software/programming/node/npm.cmd run build`
Expected: 构建成功,无 TypeScript 错误

Run(Bash): `grep -r "baseURL" frontend/dist/assets/*.js | head -5`
Expected: 构建产物中 baseURL 解析为空字符串(看到类似 `baseURL:""` 的代码片段)

- [ ] **Step 3.6: 提交**

```bash
git add frontend/.env.development frontend/.env.production frontend/src/api/client.ts
git commit -m "feat(frontend): switch baseURL via VITE_API_BASE env"
```

---

## Task 4: Dockerfile 多阶段构建

构建一个能跑在 HF Spaces 的镜像:Node 阶段产出 `frontend/dist/`,Python 阶段安装后端依赖并把前端产物拷进运行镜像。监听 7860 端口(HF 强制要求)。

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 4.1: 创建 .dockerignore**

Create `.dockerignore`:

```
# 版本控制
.git/
.gitignore

# 本地依赖与构建产物
node_modules/
frontend/node_modules/
frontend/dist/
**/__pycache__/
**/*.pyc
.pytest_cache/

# 本地数据库 — 容器内会用挂载卷
backend/petri_dish.db
backend/petri_dish.db.backup*
backend/*.db
petri_dish.db
*.db

# 测试与开发产物
e2e/
e2e-results/
.playwright-mcp/
test-*.png
test-*.js
.claude/worktrees/

# 文档
.claude/
doc/
*.md
README.md.local

# 本地敏感配置
.env
backend/.env
frontend/.env.local

# OS
.DS_Store
Thumbs.db
```

注意:`.env` 必须排除,避免把 DeepSeek key 打入镜像;HF Secrets 在运行时注入。

- [ ] **Step 4.2: 创建 Dockerfile**

Create `Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.6

# ============ 阶段 1: 构建前端 ============
FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend

# 先复制 package.json 单独 npm install,利用 Docker 层缓存
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

# 复制源码并构建(.env.production 决定 VITE_API_BASE=空)
COPY frontend/ ./
RUN npm run build


# ============ 阶段 2: 后端运行镜像 ============
FROM python:3.11-slim AS runtime

WORKDIR /app

# 系统依赖最小化,只装必要的
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

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
```

- [ ] **Step 4.3: 本地构建镜像**

Run: `docker build -t petri-dish:local .`
Expected: 构建成功,最后输出 `Successfully tagged petri-dish:local`,总耗时 3-8 分钟(首次)。

如果 `npm ci` 报 `package-lock.json missing`,改 `frontend/package-lock.json* ./` 中的 `*` 不要去掉(允许文件不存在),并先跑一次 `cd frontend && npm install` 生成 lock 文件再 commit。

- [ ] **Step 4.4: 检查镜像大小合理**

Run: `docker images petri-dish:local --format "{{.Size}}"`
Expected: <500MB(python:3.11-slim 基础约 130MB + 依赖)

如果超过 1GB,检查 `.dockerignore` 是否漏排 `node_modules` 或 `.git`。

- [ ] **Step 4.5: 提交**

```bash
git add Dockerfile .dockerignore
git commit -m "feat(deploy): multi-stage Dockerfile for HF Spaces"
```

---

## Task 5: 本地容器集成测试

跑起来验证:容器能启、API 能访问、前端能加载、SQLite 持久化(挂卷)生效、DeepSeek 杂交链路通。

**Files:**
- 无新建,纯验证步骤

- [ ] **Step 5.1: 准备本地数据卷与环境变量**

Run: `mkdir -p ./test-data`

确认你有有效的 DeepSeek key(从 `backend/.env` 中读)。

- [ ] **Step 5.2: 启动容器**

Run:
```bash
docker run --rm -d \
  --name petri-test \
  -p 7860:7860 \
  -v "$(pwd)/test-data:/data" \
  -e DEEPSEEK_API_KEY="<your-deepseek-api-key>" \
  -e DEEPSEEK_BASE_URL="https://api.deepseek.com" \
  -e DEEPSEEK_MODEL="deepseek-chat" \
  petri-dish:local
```

Expected: 输出容器 ID(64 位 hash),退出码 0。

- [ ] **Step 5.3: 检查容器日志**

Run: `docker logs petri-test`
Expected: 看到 `Database connected`、`Static frontend mounted: /app/frontend/dist`、`Uvicorn running on http://0.0.0.0:7860`。

如果看到 `Warning: frontend dist not found`,说明 Dockerfile 的 COPY 阶段失败,需排查。

- [ ] **Step 5.4: 测试健康检查端点**

Run: `curl -s http://localhost:7860/health`
Expected: `{"status":"healthy"}`

- [ ] **Step 5.5: 测试 API info 端点**

Run: `curl -s http://localhost:7860/api/info`
Expected: `{"message":"Petri Dish API 正在运行","version":"0.1.0"}`

- [ ] **Step 5.6: 测试根路径返回前端**

Run: `curl -s http://localhost:7860/ | head -c 200`
Expected: 看到 `<!doctype html>` 开头的 HTML(Vite 构建产物)。

- [ ] **Step 5.7: 浏览器烟雾测试核心流程**

打开浏览器 `http://localhost:7860/`:

1. 输入名字,点注册
2. 创建一个培养皿
3. 输入 DNA 提示词 + 文本上传一只真菌
4. 再上传第二只真菌
5. 点击触发杂交,等待 5 秒孵化
6. 鼠标悬停杂交结果查看 AI 生成的融合文本
7. Ctrl+鼠标悬停查看亲本

Expected: 全流程顺畅,Network 面板看到所有请求 HTTP 200。

- [ ] **Step 5.8: 验证 SQLite 持久化(挂卷)**

Run: `ls -la ./test-data/`
Expected: 看到 `petri_dish.db` 文件,有内容(>20KB,因为有数据)。

Run: `docker stop petri-test`
Run: `docker run --rm -d --name petri-test2 -p 7860:7860 -v "$(pwd)/test-data:/data" -e DEEPSEEK_API_KEY="sk-..." petri-dish:local`

刷新浏览器 `http://localhost:7860/`,用同样名字登录(本地 storage 应记得 user_id),应能看到刚才创建的培养皿和真菌。

Expected: 数据持久化生效。

- [ ] **Step 5.9: 清理本地容器**

Run: `docker stop petri-test2 && docker rm -f petri-test petri-test2 2>/dev/null; rm -rf ./test-data`
Expected: 清理完成。

- [ ] **Step 5.10: 提交(若有路径修复)**

如果上述测试中改动了 Dockerfile 或代码,逐一 commit。否则跳过本步。

```bash
git add Dockerfile
git commit -m "fix(deploy): adjust Dockerfile after local container test"
```

---

## Task 6: HuggingFace Space 配置

在 HF 上创建 Space,设置 README frontmatter(决定 SDK + 端口 + 硬件),挂载 Storage Bucket,注入 Secrets。

**Files:**
- Create: `README.md`(项目根 — 注意会被 HF Space 元数据使用)

⚠️ **当前项目根可能没有 README.md。HF Space 仓库根的 README.md frontmatter 是 Space 配置入口,必须有。**

⚠️ **HF Space 可以是独立 git repo,也可以从 GitHub 导入。我们用独立 repo 模式,本地多加一个 git remote 推送。**

- [ ] **Step 6.1: 创建 HuggingFace 账号**

浏览器打开 `https://huggingface.co/join`,用邮箱注册(无需手机/卡)。验证邮箱。

Expected: 登录后有自己的 username(如 `petri-dish-author`)。

- [ ] **Step 6.2: 创建 Space**

打开 `https://huggingface.co/new-space`:
- Space name: `petri-dish`(或自定义)
- License: `mit`
- SDK: **Docker** → **Blank** template
- Hardware: **CPU basic - 2 vCPU 16GB**(永久免费)
- Visibility: Public(免费)或 Private(免费 tier 也支持)

点 `Create Space`。

Expected: 跳转到 `https://huggingface.co/spaces/<username>/petri-dish`,看到空 Space 提示克隆该 repo 推代码。

- [ ] **Step 6.3: 配置 Space Secrets**

在 Space 页面顶部 → `Settings` → 滚到 `Variables and secrets` → `New secret`:

| Name | Value |
|------|-------|
| `DEEPSEEK_API_KEY` | `<your-deepseek-api-key>` |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-chat` |

⚠️ Secrets 一旦写入无法读出(只能改/删),保存好原 key。

Expected: 三条 secrets 显示在列表中,值显示为 `********`。

- [ ] **Step 6.4: 创建 Space 项目根 README.md**

Create `README.md`(项目根):

````markdown
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

AI 媒介艺术实验 — 用真菌隐喻表达文本传播与杂交。前端 React + Fabric.js,后端 FastAPI,AI 调用 DeepSeek。

## 部署

本 Space 采用 Docker SDK 单服务方案,前后端打包成同一容器,SQLite 数据通过挂载卷持久化。

详细部署计划见 `.claude/plans/2026-04-27-hf-spaces-deploy.md`。

## 本地开发

```bash
# 后端
cd backend && python -m uvicorn api:app --host 127.0.0.1 --port 8000

# 前端
cd frontend && npm install && npm run dev
```

## 技术栈

- 前端:Vite 8 + React 19 + TailwindCSS v4 + Fabric.js v7
- 后端:FastAPI + SQLite + aiosqlite
- AI:DeepSeek 官方 API
````

⚠️ frontmatter 中的 `app_port: 7860` 让 HF 把容器 7860 端口对外暴露;`sdk: docker` 让 HF 用 Dockerfile 构建。

- [ ] **Step 6.5: 提交 README.md**

```bash
git add README.md
git commit -m "docs: add HF Space metadata README"
```

- [ ] **Step 6.6: 添加 HF Space 为 git remote**

(把 `<username>` 换成你的 HF 用户名)

```bash
git remote add hf https://huggingface.co/spaces/<username>/petri-dish
git remote -v
```

Expected: 看到 `hf` remote 指向 huggingface.co。

- [ ] **Step 6.7: 决定 Storage Bucket 策略**

HF Storage Buckets 有免费额度(具体数额见 `https://huggingface.co/storage`),5MB 级别的 SQLite 数据库远低于免费上限。

**两条路径选一:**

**A. 暂时不挂 Bucket(MVP 路径,推荐)**:容器内 `/data` 是 ephemeral,Space 重启会丢数据 — 但艺术实验项目早期演示对持久化不严苛,先跑通流程。

**B. 挂载 Bucket(生产路径)**:在 Space Settings → Persistent storage → Add Storage,选 `Small`(免费 1GB 不到的额度,具体看页面),挂载点写 `/data`。

**MVP 选 A。** 走通后再切 B,避免初期被 Bucket 配置卡住。

记录决定:`A / B = ____`

- [ ] **Step 6.8: 推送代码到 HF Space**

```bash
git push hf master:main
```

(HF Space 默认主分支是 `main`,本地是 `master`,所以做映射)

可能需要登录,首次推送会弹 HuggingFace 用户名 + token(token 在 `https://huggingface.co/settings/tokens` 创建,选 `write` 权限)。

Expected: 推送成功;HF Space 页面切到 `Building...` 状态。

- [ ] **Step 6.9: 监控 Space 构建**

打开 Space 页面 → `Logs` → `Container logs`。

Expected: 5-10 分钟内看到 `Successfully built`、`Database connected`、`Uvicorn running on http://0.0.0.0:7860`。

如果失败:
- 看 `Build logs` 找 `Error` 关键字
- 常见问题:`npm ci` 失败 → 检查 `frontend/package-lock.json` 是否提交;Python 依赖装不上 → 检查 `requirements.txt` 版本

- [ ] **Step 6.10: 提交 git remote 配置(可选)**

git remote 是本地 git config,不会进 commit。本步无文件改动。

---

## Task 7: 上线烟雾测试 + 切换持久化策略

确认在 HF 上一切正常,根据初次访问表现决定是否切到挂载 Bucket 模式。

**Files:**
- 无新建,纯验证步骤

- [ ] **Step 7.1: 访问 Space URL 烟雾测试**

打开 `https://<username>-petri-dish.hf.space/`(注意 HF Space URL 是 `<username>-<spacename>.hf.space`,不是带子目录的)。

或者从 Space 页面顶部点 `App` 标签直接进入。

Expected: 首屏正常,出现欢迎/注册界面。

- [ ] **Step 7.2: 验证核心流程**

重复 Step 5.7 的浏览器流程:注册 → 培养皿 → 上传真菌 → 杂交。

特别检查:
- DeepSeek 调用是否成功(杂交结果文本是否真为 AI 生成,不是 fallback `xxx + xxx`)
- DevTools Network 看请求 status 200
- 后端日志(Space 页面 `Logs` → `Container logs`)显示 `[杂交] AI结果:` 行

Expected: 全流程通,AI 杂交真的产出有意义的文本。

- [ ] **Step 7.3: 国内访问性能评估**

从国内不同网络(家用宽带、手机蜂窝)分别打开 Space URL。

- 首屏加载时间 < 5 秒:✅ 国内体验可接受
- 5-15 秒:⚠️ 用户首次访问要耐心
- > 15 秒或经常超时:❌ 切到 Vercel + Railway 备选方案

Expected: 至少能加载,杂交 API 调用成功(DeepSeek 走国内出海到 deepseek.com,与 HF 节点位置无关)。

- [ ] **Step 7.4: 决定持久化策略 — 若选 Step 6.7 的 B**

如果烟雾测试结束你已经依赖测试期生成的数据,在 Space 重启后这些数据会丢。要保留:

1. Space 页面 → `Settings` → `Persistent storage` → `Small` 套餐(看清是否在免费额度内,通常 ≤20GB 免费)
2. 等 Space 重启完成
3. 容器内 `/data` 现在是持久卷
4. Dockerfile 的 `ENV PETRI_DB_PATH=/data/petri_dish.db` 已经指向这里,无需改代码

Expected: Persistent storage 状态显示 `Mounted`,新建测试数据 → 重启 Space → 数据仍在。

- [ ] **Step 7.5: 更新项目检查点**

Edit `.claude/checkpoints/current.md`,把 CP4.3 部署部分:
- ❌ 划掉"后端 Zeabur + 前端 Vercel"
- ✅ 改为"HuggingFace Spaces Docker SDK 单服务"
- 记录 Space URL

(具体修改根据当前 checkpoint 文件结构来,本步是软约束,不卡 deploy)

- [ ] **Step 7.6: 最终提交**

```bash
git add .claude/checkpoints/current.md
git commit -m "docs(checkpoint): mark CP4.3 deployed via HF Spaces"
git push origin master
git push hf master:main
```

Expected: GitHub 和 HF 两个 remote 都同步。

---

## Risk Mitigation

| 风险 | 概率 | 缓解 |
|------|------|------|
| 首次 docker build 卡在 npm ci | 中 | 先在本地跑 `cd frontend && npm install` 生成 lock 文件再提交 |
| HF 国内访问不稳定 | 中 | 准备 Vercel + Railway 备选方案(见研究报告 Top 2) |
| Storage Bucket 免费额度耗尽 | 低 | SQLite ≤10MB,远低于免费阈值;监控 Space 用量页 |
| DeepSeek key 误入 git | 低 | `.dockerignore` 已排 `.env`;HF Secrets 注入运行时 |
| FastAPI 路由被 StaticFiles 拦截 | 低 | Task 2 测试覆盖路由优先级;mount 必须最后调用 |
| HF Space 构建超 10 分钟超时 | 低 | 多阶段构建已优化层缓存,首次 5-8 分钟典型 |

---

## Post-Launch Checklist

- [ ] Space URL 已分享给至少 3 个测试用户(国内 + 国外都有)
- [ ] DeepSeek API 用量监控(在 deepseek.com 后台)避免余额耗尽
- [ ] 准备好"如果 HF 国内访问慢"的话术,引导用户用代理或 cellular
- [ ] 把 Space URL 添加到项目 `.claude/CLAUDE.md` 或 README 顶部
