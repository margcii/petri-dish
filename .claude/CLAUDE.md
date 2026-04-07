# Petri Dish - Claude 配置

## 工作流

使用 @quikdev Skill 进行快速开发

> 自动模式权限配置在本文件夹 `settings.local.json`

## 项目上下文

| 文档 | 位置 | 内容 |
|------|------|------|
| 完整架构 | @.claude/doc/architecture.md | 业务逻辑、交互机制、数据流、ASCII图示 |
| 检查点计划 | @.claude/checkpoints/current.md | CP1-CP4 开发里程碑与当前进度 |
| 项目专属 Skill | @.claude/skills/petri-dish-context/ | 真菌隐喻、技术栈、API端点速查 |

## 技术栈速查

- **前端**: Vite + React + TypeScript + TailwindCSS
- **后端**: FastAPI + SQLite + aiosqlite
- **AI**: DeepSeek API（文本杂交）

## 开发服务器

```bash
# 启动后端
cd backend && python run.py

# 启动前端
cd frontend && npm run dev
```

## 快速指令

- `规划[功能]` → Plan Mode，更新检查点
- `开始[检查点]` → Subagent 开发
- `通过` → Git 提交 + 经验归档

## 关键隐喻

- **真菌** = 文本的具象化表征
- **空气** = 公共传播空间
- **培养皿** = 个人接收/处理空间
- **杂交** = AI参与的文本重组
