const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 访问首页
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(1000);

  // 输入用户名
  await page.fill('input[placeholder="你的名字"]', '测试用户');
  await page.click('button:has-text("进入实验室")');
  await page.waitForTimeout(2000);

  // 截图主界面
  await page.screenshot({ path: 'D:/work/Engineering/projects/petri dish/test-main.png', fullPage: true });
  console.log('主界面截图完成');

  // 点击"放入培养皿"按钮展开下拉
  await page.click('button:has-text("放入培养皿")');
  await page.waitForTimeout(1000);

  // 截图查看下拉菜单（应该包含"从空气吸入真菌"按钮）
  await page.screenshot({ path: 'D:/work/Engineering/projects/petri dish/test-dropdown.png', fullPage: true });
  console.log('下拉菜单截图完成');

  await browser.close();
  console.log('所有截图完成');
})();
