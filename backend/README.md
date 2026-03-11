# Petri Dish Backend - 后端服务说明

## 项目概述

Petri Dish 是一个 AI 媒介艺术实验项目，以**真菌隐喻文本传播与杂交**为核心概念。

## 目录结构

```
backend/
├── api.py           # FastAPI 主文件 - 定义所有 HTTP API 端点
├── models.py        # 数据模型 - SQLAlchemy ORM 模型定义
├── database.py      # 数据库操作 - SQLite 异步数据库操作封装
├── requirements.txt # Python 依赖包列表
└── __init__.py      # 包初始化文件
```

## 文件说明

### `api.py` - API 接口主文件

FastAPI 应用主文件，包含所有 REST API 端点：

| 端点 | 方法 | 功能描述 |
|------|------|----------|
| `/` | GET | 根路径 - 返回 API 信息 |
| `/register` | POST | 用户注册 |
| `/user/{user_id}` | GET | 获取用户信息 |
| `/create_dish` | POST | 创建培养皿 |
| `/dish/{dish_id}` | GET | 获取培养皿信息 |
| `/user/{user_id}/dishes` | GET | 获取用户的所有培养皿 |
| `/upload` | POST | 上传文本，生成真菌 |
| `/get_dish/{dish_id}` | GET | 获取培养皿中的真菌列表 |
| `/breathe` | POST | 空气传播触发 - 将空气中的真菌分配到培养皿 |
| `/trigger_hybrid` | POST | 触发杂交检查 |
| `/check_hybrid/{fungus_id}` | GET | 检查杂交真菌孵化状态 |
| `/assets/{image_id}.png` | GET | 获取真菌贴图 |

### `models.py` - 数据模型

定义三个核心数据模型：

- **User** - 用户模型
  - user_id, name, created_at

- **Dish** - 培养皿模型
  - dish_id, user_id, name, created_at

- **Fungus** - 真菌模型（文本的具象化表征）
  - fungus_id, text, image_id, creator_id, parent_ids, status, location, unlock_time, created_at

### `database.py` - 数据库操作

提供 `Database` 类封装所有 SQLite 操作：

- **用户操作**: create_user, get_user, get_user_by_name
- **培养皿操作**: create_dish, get_dish, get_dishes_by_user
- **真菌操作**: create_fungus, get_fungus, get_fungi_by_dish, get_all_air_fungi, update_fungus_location, update_fungus_status, get_incubating_fungi, get_idle_fungi_in_dish

使用 `aiosqlite` 实现异步数据库操作，避免阻塞。

### `requirements.txt` - 依赖包

```
fastapi==0.115.0      # Web 框架
uvicorn==0.32.0       # ASGI 服务器
sqlalchemy==2.0.35    # ORM 框架
aiosqlite==0.20.0     # 异步 SQLite
python-dotenv==1.0.1  # 环境变量管理
httpx==0.27.2         # HTTP 客户端（用于 DeepSeek API 调用）
```

## 启动服务

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- ReDoc 文档: http://localhost:8000/redoc

## 系统机制说明

### 1. 真菌状态流转

```
idle (空闲) → incubating (孵化中) → idle (空闲)
```

- **idle**: 真菌处于可交互状态
- **incubating**: 真菌正在孵化（杂交后 60 秒）

### 2. 空气传播机制

- `/breathe` 接口触发
- 将空气中的真菌随机分配到用户培养皿
- 每次最多分配 5 个真菌

### 3. 杂交孵化机制

- 条件：培养皿中至少 2 个 idle 真菌
- 触发：`/trigger_hybrid` 接口
- 过程：
  1. 随机选择 2 个父真菌
  2. 调用 DeepSeek API 混合文本
  3. 创建新真菌，状态设为 `incubating`
  4. 设置 `unlock_time = now + 60s`
  5. 60秒后状态变为 `idle`

## API 使用示例

### 1. 注册用户

```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"name": "user1"}'
```

### 2. 创建培养皿

```bash
curl -X POST http://localhost:8000/create_dish \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "name": "my dish"}'
```

### 3. 上传文本生成真菌

```bash
curl -X POST http://localhost:8000/upload \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Petri Dish", "user_id": 1, "dish_id": 1}'
```

### 4. 获取培养皿内容

```bash
curl http://localhost:8000/get_dish/1
```

### 5. 触发杂交

```bash
curl -X POST http://localhost:8000/trigger_hybrid \
  -H "Content-Type: application/json" \
  -d '{"dish_id": 1}'
```

## 注意事项

1. **贴图资源**: 系统需要 `../assets/01.png` ~ `../assets/50.png` 贴图文件
2. **DeepSeek API**: 当前杂交功能使用模拟文本，如需真实 AI 生成，需在 `api.py` 中集成 DeepSeek API
3. **数据库**: 数据库文件 `petri.db` 会自动创建在 `backend/` 目录下
4. **CORS**: 已启用 CORS 支持，允许前端跨域访问

## 后续扩展

- 集成 DeepSeek API 进行真实文本混合
- 添加用户认证机制
- 实现培养皿私有化访问控制
- 添加真菌图片生成（将文本转换为图片）