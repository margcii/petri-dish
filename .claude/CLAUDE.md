# Petri Dish - Claude 项目配置

## 当前工作流
**QuikDev（快速开发）** - 自动模式已激活
> 完整规则: @D:/software/programming/static context/workflows/quikdev.md

## 自动模式权限
配置在 `.claude/settings.local.json`
> 配置来源: static/quikdev.md "新项目初始化配置"章节

## 已批准权限（自动执行）
- ✅ 文件编辑、创建、读取
- ✅ 测试运行（npm run, python）
- ✅ Git操作（add, push, branch等）
- ✅ 包安装、构建命令
- ❌ **Git提交**（需Step 3用户说"通过"后执行）

## 本地引用
- **工具路径**: @D:/software/programming/static context/context/path.md
- **经验库**: @D:/software/programming/static context/experience/

---

## 项目理解

**Petri Dish** 是一个AI媒介艺术实验平台，以"真菌"隐喻文本的传播与杂交。

### 核心概念
| 元素 | 含义 |
|------|------|
| 真菌 | 文本的具象化表征 |
| 空气 | 公共传播空间 |
| 培养皿 | 个人接收/处理空间 |
| 杂交 | AI参与的文本重组与生成 |

### 用户旅程
1. 创建身份 → 输入名称生成简单账户
2. 创建培养皿 → 命名个人空间
3. 生成真菌 → 输入文本，系统随机分配贴图
4. 选择去向 → 发射到空气 / 放入培养皿
5. 观察杂交 → 空气真菌随机落入，AI混合文本生成新真菌
6. 探索文本 → 鼠标悬停查看杂交文本，Ctrl+悬停查看源文本与创建者

### 技术栈
- **前端**: Vite + React + TypeScript + TailwindCSS
- **后端**: FastAPI + SQLite + aiosqlite
- **AI**: DeepSeek API（文本杂交）

### 数据模型
- **User**: user_id, name, created_at
- **Dish**: dish_id, user_id, name, created_at
- **Fungus**: fungus_id, text, image_id, creator_id, parent_ids, status(idle/incubating/in_air), location(air/dish_id), unlock_time, created_at

### API端点
| 端点 | 方法 | 功能 |
|------|------|------|
| /register | POST | 用户注册 |
| /create_dish | POST | 创建培养皿 |
| /upload | POST | 上传文本生成真菌 |
| /get_dish/{dish_id} | GET | 获取培养皿详情 |
| /breathe | POST | 将空气真菌吸入培养皿 |
| /trigger_hybrid | POST | 触发两个真菌杂交 |
| /check_hybrid/{fungus_id} | GET | 检查杂交孵化状态 |

---

## 检查点计划

### CP1: 后端API + 前端初始化 ✅ 已完成
**提交**: `1b67464`
**验收标准**:
- [x] FastAPI框架搭建，SQLite异步连接
- [x] 数据库表结构（users, dishes, fungi）
- [x] Pydantic数据模型定义
- [x] 所有核心API端点实现并通过Postman测试
- [x] Vite + React + TypeScript项目初始化
- [x] TailwindCSS + ESLint配置

**经验归档**:
- Windows环境下后台进程管理复杂，使用run.py和start_server.bat手动启动更可靠
- FastAPI + aiosqlite实现异步SQLite操作，避免阻塞

---

### CP2: 前端核心交互 ⏳ 当前

#### CP2.1: 用户入口与身份系统 ⏸️ 进行中（需修复）
**目标**: 让用户能快速创建身份并进入系统
**业务逻辑**: 用户只需输入名称即可创建临时账户，user_id本地存储实现"记住我"

**验收标准**:
- [x] 简洁的欢迎页（项目介绍 + 名称输入框）
- [ ] 调用 `/register` 创建用户 ← **阻塞：后端未运行 + Vite代理未配置**
- [x] localStorage存储 user_id，刷新不丢失
- [x] 自动跳转到培养皿列表页

**审查问题**:
1. **后端服务未启动** - FastAPI未运行导致API调用失败
2. **API代理配置缺失** - `api/client.ts` baseURL为`/api`但Vite未配置proxy

**修复方案**:
- [ ] 启动后端: `cd backend && python run.py`
- [ ] 配置Vite代理: `vite.config.ts` 添加 `server.proxy['/api']`
- [ ] 或修改client.ts直接使用完整URL `http://localhost:8000`

**已产出文件**:
- `src/pages/Welcome.tsx` - 艺术感欢迎页（脉冲动画背景）
- `src/pages/DishList.tsx` - 列表页空壳
- `src/App.tsx` - 路由配置
- `src/api/user.ts` - localStorage + API封装

---

#### CP2.2: 培养皿管理界面 📋 待开始
**目标**: 用户可以创建和管理多个培养皿
**业务逻辑**: 一个用户可有多个培养皿（实验空间），点击进入详情

**验收标准**:
- [ ] 培养皿列表页（网格展示，显示名称和真菌数量）
- [ ] 创建培养皿按钮 + 弹窗表单（调用 `/create_dish`）
- [ ] 培养皿卡片点击进入详情页
- [ ] 详情页基础布局（左侧信息 + 右侧真菌展示区）
- [ ] 空状态提示（首次进入引导创建）

**API依赖**: `/create_dish`, `/get_dish`, `/user_dishes`
**路由**: `/dishes` → `/dishes/:dishId`

---

#### CP2.3: 真菌可视化与基础交互 📋 待开始
**目标**: 在培养皿内展示真菌，支持上传新真菌
**业务逻辑**: 真菌用图片表示，status不同有不同视觉状态（idle=明亮, incubating=半透明+倒计时）

**验收标准**:
- [ ] Fungus组件：显示图片 + 悬停显示文本tooltip
- [ ] 真菌网格布局（自适应排列）
- [ ] 上传按钮：弹出文本输入框，调用 `/upload`
- [ ] 上传成功后本地刷新列表（或乐观更新）
- [ ] 孵化中真菌显示倒计时（每秒更新，调用 `/check_hybrid`）
- [ ] 孵化完成自动变为可交互状态

**API依赖**: `/upload`, `/get_dish`, `/check_hybrid`
**关键交互**: Tooltip悬停显示文本内容

---

#### CP2.4: 空气传播与杂交系统 📋 待开始
**目标**: 实现"空气"公共空间和杂交玩法
**业务逻辑**: 
- 空气是公共空间，所有用户上传的"发射到空气"的真菌在此漂浮
- 用户可以"呼吸"（breathe）将空气真菌吸入自己的培养皿
- 培养皿内≥2个idle真菌时，可选择两个进行杂交，60秒后生成新真菌

**验收标准**:
- [ ] 空气展示区：漂浮动画的真菌（从 `/air` 获取）
- [ ] 呼吸按钮：点击调用 `/breathe`，成功后真菌"飞入"培养皿动画
- [ ] 杂交选择模式：多选两个真菌，高亮显示
- [ ] 杂交按钮：调用 `/trigger_hybrid`，创建incubating状态真菌
- [ ] 全局5秒轮询：自动同步培养皿状态（其他用户操作）
- [ ] 杂交历史展示：显示父真菌关系（可选，CP3前可用简单文本）

**API依赖**: `/air`, `/breathe`, `/trigger_hybrid`
**复杂逻辑**: 
- 5秒轮询机制（setInterval + cleanup）
- 杂交倒计时与全局轮询的协调
- 多用户同时操作的乐观更新/冲突处理

---

### CP3: AI杂交集成 📋 待规划
**目标**: 接入DeepSeek API实现智能文本杂交

**验收标准**:
- [ ] DeepSeek API密钥配置
- [ ] 杂交时调用AI混合两段文本
- [ ] 显示杂交进度与结果
- [ ] 错误处理与重试机制

---

### CP4: 优化与部署 📋 待规划
**目标**: 完善体验并部署上线

**验收标准**:
- [ ] 响应式适配移动端
- [ ] 图片资源加载优化
- [ ] 后端部署到Zeabur
- [ ] 前端部署到Vercel

---

## QuikDev 快速参考

### 触发指令
- `规划[功能]` → Step 1: Plan Mode
- `开始[检查点]` → Step 2: Subagent开发
- `通过` → Step 3: Git提交 + 经验归档

### 开发服务器
```bash
# 启动后端
cd backend && python run.py

# 启动前端
cd frontend && npm run dev
```

### Context管理
- 每个检查点后 `/clear` 重置（可选）
- 主窗口仅保留：检查点摘要 + 审查反馈 + 经验讨论
