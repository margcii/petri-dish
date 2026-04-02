---
name: TailwindCSS v4 Vite配置
description: TailwindCSS v4需要@tailwindcss/vite插件
type: project
---

## 经验
TailwindCSS v4 不再使用 postcss 配置，需安装 `@tailwindcss/vite` 并在 `vite.config.ts` 中引入 `tailwindcss()` 插件。

**Why**: v4 改为基于 CSS 原生 `@import "tailwindcss"`，需要 Vite 插件支持才能正确处理。

**How to apply**: 新项目初始化或升级 TailwindCSS 到 v4 时，检查 vite.config.ts 是否正确配置。

## 配置示例
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* index.css */
@import "tailwindcss";
```

## 时间
2026-04-02
