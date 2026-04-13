import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // Collect browser console logs
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));

  try {
    // Step 1: Register via API
    console.log('Registering user via API...');
    const apiRes = await page.request.post('http://localhost:5173/api/register', {
      data: { name: 'testuser' }
    });
    const userData = await apiRes.json();
    const userId = userData.user_id;
    console.log('User registered:', userId);

    // Step 2: Navigate to the app
    console.log('Navigating to app...');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Set localStorage with the user data
    await page.evaluate((uid) => {
      localStorage.setItem('petri_user', JSON.stringify({
        user_id: uid,
        name: 'testuser',
        created_at: '2026-04-12T00:00:00'
      }));
    }, userId);

    // Navigate to /main
    await page.goto('http://localhost:5173/main', { waitUntil: 'load', timeout: 15000 });

    // Wait for React to render - check for root content
    console.log('Waiting for React to render...');
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 15000 }).catch(() => console.log('Root still empty after 15s'));

    await page.waitForTimeout(2000);

    console.log('Current URL:', page.url());
    const rootHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML?.substring(0, 500));
    console.log('Root innerHTML:', rootHTML);

    // Step 3: Screenshot main page
    console.log('Taking screenshot of main page...');
    await page.screenshot({ path: 'D:/work/Engineering/projects/petri dish/e2e/pixel-main.png', fullPage: false });
    console.log('Saved pixel-main.png');

    // Step 4: Look for the + NEW button
    const allButtons = await page.locator('button').allTextContents();
    console.log('Buttons:', allButtons);

    const newBtn = page.locator('button:has-text("NEW")');
    const btnCount = await newBtn.count();

    if (btnCount > 0) {
      console.log('Found NEW button, clicking...');
      await newBtn.first().click();
      await page.waitForTimeout(800);

      // Step 5: Fill dish name and CREATE
      const modalInput = page.locator('input[placeholder="NAME..."]');
      if (await modalInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modalInput.fill('test-dish');
        console.log('Clicking CREATE...');
        await page.getByRole('button', { name: 'CREATE' }).click();
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('NEW button not found on page. Creating dish via API...');
      await page.request.post('http://localhost:5173/api/dishes', {
        data: { user_id: userId, name: 'test-dish' }
      });
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    // Step 6: Screenshot with dish
    console.log('Taking screenshot with dish...');
    await page.screenshot({ path: 'D:/work/Engineering/projects/petri dish/e2e/pixel-with-dish.png', fullPage: false });
    console.log('Saved pixel-with-dish.png');

    console.log('All done!');
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'D:/work/Engineering/projects/petri dish/e2e/pixel-error.png', fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
