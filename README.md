# petri-dish
一个有些无聊的充满真菌的地方


  > AI媒介艺术实验：用"真菌隐喻"探索文本的传播与杂交

  [在线体验](https://margcii-petri-dish.hf.space) · [架构文档](.claude/doc/architecture.md)

  ---

  ## 核心隐喻

  | 隐喻 | 现实 |
  |------|------|
  | **真菌** | 文本的具象化表征 |
  | **空气** | 公共传播空间 |
  | **培养皿** | 个人接收/处理空间 |
  | **杂交** | AI 参与的文本重组 |

  ---

  ## 系统架构
<img width="630" height="761" alt="image" src="https://github.com/user-attachments/assets/de1c0d80-5413-4d9d-a47a-02641e19f8fa" />


  ---

  ## 交互机制

  ### 1. 种植 → 发射 → 吸入

  写文本 → 选择颜色/DNA → [放入培养皿] 或 [🚀发射到空气]

  ### 2. 空气多寿命机制

  空气真菌有 `fall_remaining=3` 的寿命：
  - 每次被用户吸入，寿命 -1
  - 同一用户只能吸入同一真菌 1 次
  - 寿命归零自动删除（无需人工清理）

  ### 3. 自动杂交

  培养皿中 ≥2 个 `idle` 真菌时，系统自动：
  1. 随机选取 2 个未杂交过的真菌
  2. 标记为 `is_parent`（不再参与后续杂交）
  3. 调用 DeepSeek API 生成融合文本
  4. 创建 `incubating` 状态杂交真菌，5 秒后孵化完成

  ### 4. AI 杂交处理

  系统提示词核心规则：

  1. 把两段文本各自拆成 3-5 字碎片
  2. 交错排列，用换行/空格控制节奏
  3. 同一碎片可重复出现，制造回声
  4. 允许极简连接词（的、了、而、却），禁止整句照搬
  5. **只能使用给定两段文本中的字词碎片**，严禁引入外部词句

  DNA 提示词（100字上限）影响融合风格：
  - 双方都有 DNA → 平均分配倾向
  - 单方有 DNA → 单侧加权
  - 都无 DNA → 纯基础拼贴

  ---

  ## 技术栈

  ### 前端
  - Vite 8 + React 19 + TypeScript
  - TailwindCSS v4（CSS-first 配置）
  - Fabric.js v7（Canvas 渲染）
  - React Router DOM v7

  ### 后端
  - FastAPI 0.104 + uvicorn 0.24
  - SQLite + aiosqlite（异步）
  - DeepSeek 官方 API（`deepseek-chat`）

  ### 部署
  - HuggingFace Spaces Docker SDK
  - 多阶段构建：node:22-slim → python:3.11-slim
  - 镜像大小：247MB
