---
name: 后端UUID与前端类型对齐
description: 前后端ID类型不一致时的修复流程
type: project
---

## 经验
当后端使用 UUID 字符串而前端使用 number 类型时，需要同步修改三处：
1. API 接口定义（dish.ts/user.ts）
2. 函数参数类型
3. 调用处的类型/转换

**Why**: TypeScript 不会自动转换 string/number，不匹配会导致 API 调用类型错误。

**How to apply**: 
```typescript
// 1. 修改接口定义
export interface Dish {
  dish_id: string  // 原为 number
}

// 2. 修改函数参数
export async function getDish(dishId: string)  // 原为 number

// 3. 修改调用处
// 移除 Number() 转换
fetchDishes(storedUser.user_id)  // 原为 fetchDishes(Number(storedUser.user_id))
```

## 修复文件
- frontend/src/api/dish.ts
- frontend/src/api/user.ts
- frontend/src/pages/Main.tsx
- frontend/src/pages/DishList.tsx

## 时间
2026-04-02
