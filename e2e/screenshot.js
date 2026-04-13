const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 1. Welcome page
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/pixel-welcome.png', fullPage: true });

  // 2. Register and go to main
  const nameInput = await page.$('input[type="text"], input[placeholder]');
  if (nameInput) {
    await nameInput.fill('testuser');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  // 3. Main page
  if (page.url().includes('/main')) {
    await page.screenshot({ path: 'e2e/pixel-main.png', fullPage: true });

    // 4. Create a dish
    const newBtn = await page.$('button:has-text("NEW")');
    if (newBtn) {
      await newBtn.click();
      await page.waitForTimeout(500);
      const dishInput = await page.$('input[placeholder="NAME..."]');
      if (dishInput) {
        await dishInput.fill('test-dish');
        const createBtn = await page.$('button:has-text("CREATE")');
        if (createBtn) await createBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    await page.screenshot({ path: 'e2e/pixel-with-dish.png', fullPage: true });
  }

  // 5. Library page
  await page.goto('http://localhost:5173/dishes');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/pixel-library.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved to e2e/');
})();
