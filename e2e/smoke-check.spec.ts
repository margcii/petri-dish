import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'e2e-results';

test.describe('Petri Dish 前端自动检查', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    // Collect uncaught exceptions
    page.on('pageerror', (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
    });
  });

  test('Step 1 & 2: 访问首页并截图，确认无白屏', async ({ page }) => {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Screenshot the landing/welcome page
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/step2-welcome.png`,
      fullPage: true,
    });

    // Check page is not blank — body should have content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);

    // Check no white screen — there should be visible elements
    const visibleElements = await page.locator('body *:visible').count();
    expect(visibleElements).toBeGreaterThan(0);
  });

  test('Step 3 & 4: 输入用户名注册并进入主界面截图', async ({ page }) => {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Try to find the username input field
    const inputSelectors = [
      'input[type="text"]',
      'input[type="username"]',
      'input[placeholder*="用户" i]',
      'input[placeholder*="user" i]',
      'input[placeholder*="名" i]',
      'input[placeholder*="name" i]',
      'input:not([type="hidden"]):not([type="password"])',
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill('testuser123');
        inputFound = true;

        // Try to find and click a submit/enter button
        const buttonSelectors = [
          'button:has-text("进入")',
          'button:has-text("登录")',
          'button:has-text("注册")',
          'button:has-text("开始")',
          'button:has-text("Enter")',
          'button:has-text("Login")',
          'button:has-text("Start")',
          'button:has-text("Submit")',
          'button[type="submit"]',
          'button',
        ];

        for (const btnSelector of buttonSelectors) {
          const btn = page.locator(btnSelector).first();
          if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btn.click();
            break;
          }
        }
        break;
      }
    }

    if (!inputFound) {
      // Try pressing Enter to submit
      await page.keyboard.press('Enter');
    }

    // Wait for navigation / main interface to load
    await page.waitForTimeout(3000);

    // Screenshot the main interface
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/step4-main.png`,
      fullPage: true,
    });
  });

  test.afterAll(async () => {
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach((e) => console.log(e));
      console.log('======================\n');
    } else {
      console.log('\n=== No console errors found ===\n');
    }
  });
});