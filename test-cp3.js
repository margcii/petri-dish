const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 访问首页
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(1000);

  // 输入用户名
  await page.fill('input[placeholder="你的名字"]', 'AI测试用户');
  await page.click('button:has-text("进入实验室")');
  await page.waitForTimeout(2000);

  // 截图主界面
  await page.screenshot({ path: 'D:/work/Engineering/projects/petri dish/test-cp3-main.png', fullPage: true });
  console.log('CP3 主界面截图完成');

  await browser.close();
})();
