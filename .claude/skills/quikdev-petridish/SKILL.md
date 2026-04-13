---
name: quikdev-petridish
description: Petri Dish 项目快速开发工作流 - 检查点拆分、Subagent并行开发、Playwright自动检查
---

# QuikDev —— Petri Dish

## 核心流程（3步循环）

### Step 1: 规划（用户触发 `规划[功能]`）
1. 读取 `@.claude/checkpoints/current.md`
2. 拆解为可并行的子任务，写入 checkpoint
3. 更新 `@.claude/doc/architecture.md`（如需）

### Step 2: 开发（用户触发 `开始[检查点]`）
1. 读取验收标准
2. **拆分为可并行的子任务**（单个 Subagent prompt ≤ 3000 tokens）
3. 注入上下文：`@.claude/skills/petri-dish-context/` + `@path-tool` + 相关 memory/
4. 并行启动 Subagent
5. 合并结果

### Step 3: 自动检查 + 人工审查（用户触发 `通过`）

**⚠️ 开发完成后必须执行自动检查，禁止跳过**

#### 3a. Playwright 自动检查
启动 Playwright Subagent：
```
访问 http://localhost:3000
1. 截图首页，确认无白屏
2. 输入用户名注册
3. 截图主界面
4. 检查控制台有无红色错误
报告：通过/失败 + 截图路径
```

#### 3b. 服务确认
- 后端 `localhost:8000` ✓
- 前端 `localhost:3000` ✓
- 给出链接，等待人工审查

#### 3c. 人工通过后
git commit → 更新 checkpoint ✅ → 经验归档 memory/

## 任务拆分规则
- 3+ 文件 → 必须拆分
- 前端+后端 → 并行（接口已定时）
- 同文件 → 串行
- prompt > 3000 tokens → 拆分

## 经验注入
| 关键词 | 匹配 |
|--------|------|
| 前端/React/CSS | `*frontend*`, `*react*`, `*css*` |
| 后端/API | `*api*`, `*backend*` |
| 调试/修复 | `*debug*`, `*fix*` |

## 禁止
- ❌ 跳过 Playwright 检查直接给链接
- ❌ 不拆分复杂任务直接用过大 prompt
- ❌ 用户说"通过"前执行 git commit