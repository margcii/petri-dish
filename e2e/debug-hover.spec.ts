import { test, expect, type Page } from '@playwright/test'

async function setupUser(page: Page) {
  const resp = await page.request.post('http://localhost:8000/register', {
    data: { name: `DBG_${Date.now()}` },
  })
  const user = await resp.json()
  await page.goto('/')
  await page.evaluate((userData) => {
    localStorage.setItem('petri_user', JSON.stringify(userData))
  }, user)
  await page.goto('/main')
  await page.waitForLoadState('networkidle')
}

async function ensureDish(page: Page): Promise<string> {
  const user = await page.evaluate(() => {
    const d = localStorage.getItem('petri_user')
    return d ? JSON.parse(d) : null
  })
  if (!user) throw new Error('No user')
  const dishesResp = await page.request.get(`http://localhost:8000/user_dishes/${user.user_id}`)
  const dishesData = await dishesResp.json()
  if (dishesData.dishes && dishesData.dishes.length > 0) {
    return dishesData.dishes[0].dish_id
  }
  const createResp = await page.request.post('http://localhost:8000/create_dish', {
    data: { user_id: user.user_id, name: '调试培养皿' },
  })
  const dish = await createResp.json()
  await page.reload()
  await page.waitForLoadState('networkidle')
  return dish.dish_id
}

test('调试：Ctrl+悬浮 杂交组 subTargets 检测', async ({ page }) => {
  test.setTimeout(60000)

  // 收集 console.log
  const debugLogs: string[] = []
  page.on('console', (msg) => {
    if (msg.text().includes('[hover-debug')) {
      debugLogs.push(msg.text())
    }
  })

  await setupUser(page)
  const dishId = await ensureDish(page)

  // 添加 2 个真菌触发杂交
  await page.request.post('http://localhost:8000/upload_fungus', {
    data: { user_id: (await page.evaluate(() => JSON.parse(localStorage.getItem('petri_user')!))).user_id, content: '真菌A', dish_id: dishId, image_id: 'blue' },
  })
  await page.request.post('http://localhost:8000/upload_fungus', {
    data: { user_id: (await page.evaluate(() => JSON.parse(localStorage.getItem('petri_user')!))).user_id, content: '真菌B', dish_id: dishId, image_id: 'yellow' },
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/debug-before-hover.png' })

  // 等待 Canvas 渲染完成（观察 canvas 是否存在）
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'test-results/debug-after-wait.png' })

  // 等待 canvas 就绪（Fabric 对象在 canvas 内部，无 DOM 属性可检测）
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) {
    // Canvas 不存在则跳过交互测试，只截图
    console.log('Canvas 未找到，跳过交互测试')
  } else {
    // 移鼠标不按 Ctrl
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10)
    await page.waitForTimeout(500)

    // 按 Ctrl 并移动
    await page.keyboard.down('Control')
    await page.waitForTimeout(500)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4)
    await page.waitForTimeout(500)
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6)
    await page.waitForTimeout(500)
    await page.keyboard.up('Control')
  }

  // 输出结果
  console.log(`=== 收集到 ${debugLogs.length} 条 hover-debug ===`)
  for (const log of debugLogs.slice(0, 10)) {
    console.log(log)
  }

  // 截图供人工检查
  await page.screenshot({ path: 'test-results/debug-ctrl-hover.png' })
})
