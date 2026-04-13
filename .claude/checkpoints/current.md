# Petri Dish 检查点计划

### CP1: 后端API + 前端初始化 ✅ 已完成
**提交**: `1b67464`

---

### CP2: 前端核心交互 ✅ 已完成

#### CP2.1: 用户入口与身份系统 ✅
#### CP2.2: 培养皿管理界面 ✅
#### CP2.3: 主界面重构 + 活跃培养皿显示 ✅
#### CP2.4: 真菌上传 + 基础放入 ✅
#### CP2.5: 培养皿库 + 切换机制 ✅
#### CP2.6: 空气传播机制 ✅
#### CP2.7: 杂交系统（重叠显示） ✅
#### CP2.8: 离线机制 + 容量限制 ✅

---

### CP3: AI杂交集成 ✅ 已完成
**提交**: `8ce6545`

---

### CP4: 优化与部署 🔄 进行中

#### CP4.1: UI修复 + 交互重构 ⏳ 当前

**目标**: 解决用户审查发现的所有UI问题，重构查看交互

**验收标准**:
- [ ] 4.1.1 蓝色文字对比度：`text-klein-700/800/900` 在黑色背景上不可见，提升到 `klein-300/400`
- [ ] 4.1.2 培养皿快照：库页面卡片显示真实真菌缩略图（非占位 petridish.png）
- [ ] 4.1.3 悬浮白色亮边：普通悬浮真菌/杂交组显示白色描边高亮
- [ ] 4.1.4 去掉Ctrl交互：删除 `isCtrlPressed` 状态和 Ctrl 键监听，统一为普通模式
- [ ] 4.1.5 杂交组点击弹窗重构：上方显示杂交结果文本，下方显示子真菌PNG，点击子PNG打开文本详情
- [ ] 4.1.6 去掉缩放边框：Fabric 对象设置 `selectable: false`，移除缩放控制点
- [ ] 4.1.7 空气背景全屏：确保 AirBackground `fixed inset-0` 生效，不受父容器裁切
- [ ] 4.1.8 API切换：从 SiliconFlow 改为 DeepSeek 官方 API（key + base_url + model）

**技术重点**:
- PetriDishCanvas.tsx 重构交互逻辑（去掉Ctrl，改白色描边悬浮）
- HybridGroupDetailModal.tsx 改为上方结果+下方子PNG布局
- DishList.tsx 快照系统（轻量 DOM 渲染替代占位图）
- fabric.js 对象交互性设置
- AirBackground 全屏定位修复

---

#### CP4.2: 动画效果 + LLM优化 ⏳ 待开始

**目标**: 增加真菌蠕动动画、发射动画，优化 AI 提示词

**验收标准**:
- [ ] 4.2.1 真菌异步蠕动：空闲真菌有缓慢的呼吸/漂移动画（scale + translate 缓动）
- [ ] 4.2.2 发射到空气动画：真菌从输入区飞出到空气背景的过渡效果
- [ ] 4.2.3 LLM提示词优化：调整 `hybrid_text()` prompt，输出更有诗意/创意风格

**技术重点**:
- Fabric.js Canvas 动画（requestAnimationFrame 或 fabric.animate）
- CSS transition/keyframes 飞出动画
- ai_client.py prompt 调整

---

#### CP4.3: 部署上线 ⏳ 待CP4.1+4.2完成后

**目标**: 部署到线上，邀请内测

**验收标准**:
- [ ] 后端部署到 Zeabur
- [ ] 前端部署到 Vercel
- [ ] 线上环境可正常访问和交互
- [ ] 3 位内测用户体验无严重报错

**技术重点**:
- 环境变量配置（DeepSeek API Key）
- SQLite 数据持久化
- CORS 和代理配置