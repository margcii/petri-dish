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

#### CP4.1: UI修复 + 交互重构 ✅ 已完成
**提交**: `26832bc`

**已完成项**:
- [x] 4.1.1 文字对比度：整体配色提亮（klein-300/400），按钮/面板颜色升级
- [x] 4.1.2 培养皿快照：库页面卡片显示真实真菌缩略图（28px）
- [x] 4.1.3 悬浮高亮：普通悬浮真菌白色描边高亮
- [x] 4.1.4 去掉Ctrl交互：统一为普通悬浮模式
- [x] 4.1.5 杂交组弹窗重构：上方杂交结果文本+下方子PNG布局
- [x] 4.1.6 去掉缩放边框：Fabric 对象 `selectable: false`
- [x] 4.1.7 空气背景全屏：AirBackground `fixed inset-0` 生效
- [x] 4.1.8 API切换：DeepSeek 官方 API 已集成
- [x] 修复：未杂交真菌点击直接显示文本+作者（非1x HYBRID）
- [x] 修复：FungusDetailModal 显示用户名称（非UUID）
- [x] UI：输入框从3行增至4行
- [x] Playwright e2e：17/17 通过

---

#### CP4.2: 动画效果 + LLM优化 🔄 开发完成，待人工检测

**目标**: 增加真菌蠕动动画、发射动画，优化 AI 提示词

**验收标准**:
- [x] 4.2.1 真菌异步蠕动：空闲真菌有缓慢的 X/Y 轴交替收放蠕动（RAF 统一循环）
- [x] 4.2.2 发射到空气动画：真菌从预览区沿随机轨迹飞出屏幕的 CSS 动画
- [x] 4.2.3 空气背景全屏修复：AirBackground 用 createPortal 渲染到 body，header/footer 改为 bg-black/70
- [ ] 4.2.4 LLM提示词优化：调整 `hybrid_text()` prompt，输出更有诗意/创意风格（待开始）

**技术实现**:
- PetriDishCanvas.tsx：FungusObjectData 扩展蠕动参数 + startWriggleLoop RAF 循环
- Main.tsx：launchingFungus 状态 + 临时 fixed img 飞出动画
- AirBackground.tsx：createPortal 修复 fixed 定位
- index.css：@keyframes launch-fly

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