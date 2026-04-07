---
name: petri-dish-context
description: Petri Dish 项目专属上下文 - 真菌隐喻、技术栈、用户旅程、数据模型、API端点
---

# Petri Dish 项目上下文

## 核心隐喻

| 元素 | 含义 |
|------|------|
| 真菌 | 文本的具象化表征 |
| 空气 | 公共传播空间 |
| 培养皿 | 个人接收/处理空间 |
| 杂交 | AI参与的文本重组与生成 |

## 用户旅程

1. 创建身份 → 输入名称生成简单账户
2. 创建培养皿 → 命名个人空间
3. 生成真菌 → 输入文本，系统随机分配贴图
4. 选择去向 → 发射到空气 / 放入培养皿
5. 观察杂交 → 空气真菌随机落入，AI混合文本生成新真菌
6. 探索文本 → 鼠标悬停查看杂交文本，Ctrl+悬停查看源文本与创建者

## 技术栈

- **前端**: Vite + React + TypeScript + TailwindCSS
- **后端**: FastAPI + SQLite + aiosqlite
- **AI**: DeepSeek API（文本杂交）

## 数据模型

| 实体 | 关键字段 |
|------|----------|
| User | user_id, name, created_at |
| Dish | dish_id, user_id, name, created_at |
| Fungus | fungus_id, text, image_id, creator_id, parent_ids, status, location, unlock_time |

### 状态值
- **idle**: 空闲，可参与杂交
- **incubating**: 孵化中（5秒），不可交互
- **in_air**: 在空气中传播

### 容量限制
- 培养皿最多 **10 个真菌**
- 杂交完成后视觉上重合，但各自占位

## API端点

| 端点 | 方法 | 功能 |
|------|------|------|
| /register | POST | 用户注册 |
| /create_dish | POST | 创建培养皿 |
| /upload | POST | 上传文本生成真菌 |
| /get_dish/{dish_id} | GET | 获取培养皿详情 |
| /breathe | POST | 将空气真菌吸入培养皿 |
| /trigger_hybrid | POST | 触发两个真菌杂交 |
| /check_hybrid/{fungus_id} | GET | 检查杂交孵化状态 |

## 交互规则速查

| 操作 | 效果 |
|------|------|
| 普通悬停 | 该真菌白色描边，显示Tooltip |
| 普通点击 | 弹窗显示真菌详情 |
| Ctrl悬停（杂交组） | 组内所有真菌白色描边 |
| Ctrl点击（杂交组） | 显示杂交结果详情 |

## 空气分配机制

- 用户在线 → 优先进入活跃培养皿（未满10个）
- 活跃培养皿满 → 随机入库中未满的培养皿
- 用户离线 → 空气真菌随机入库
