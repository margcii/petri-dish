# Petri Dish - Claude 配置

## 工作流
使用 @quikdev——petridish Skill 进行快速开发

> 自动模式权限配置在本文件夹 `settings.local.json`

## 项目上下文

| 文档 | 位置 | 内容 |
|------|------|------|
| 完整架构 | @.claude/doc/architecture.md | 业务逻辑、交互机制、数据流 |
| 检查点计划 | @.claude/checkpoints/current.md | CP1-CP4 开发里程碑 |
| 项目专属 Skill | @.claude/skills/petri-dish-context/ | 真菌隐喻、技术栈速查 |

## 技术栈
- **前端**: Vite + React + TypeScript + TailwindCSS v4 + Fabric.js v7
- **后端**: FastAPI + SQLite + aiosqlite
- **AI**: DeepSeek 官方 API（deepseek-chat）

## 开发服务器
```bash
# 后端（Anaconda）
cd backend && D:/software/programming/Anaconda3/python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
# 前端
cd frontend && npm run dev
```

## 已知约束
- Tailwind v4: `@import "tailwindcss"` + `@theme {}`，不支持 `@apply` 自定义类
- Fabric.js v7: 对象需 `selectable: false` 避免缩放边框
- Windows: 用 Anaconda Python，不用 WindowsApps 版