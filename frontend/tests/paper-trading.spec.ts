import { test, expect } from '@playwright/test';

test.describe('OKX Paper Trading E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/trading');
    await page.waitForLoadState('networkidle');
  });

  test('1. 限价买入BTC', async ({ page }) => {
    // 验证模拟盘模式提示
    await expect(page.locator('text=📊 模拟盘模式')).toBeVisible();

    // 输入交易参数
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.selectOption('select:has-text("买入")', 'BUY');
    await page.selectOption('select:has-text("限价")', 'LIMIT');
    await page.fill('input[placeholder*="数量"]', '0.01');
    await page.fill('input[placeholder*="价格"]', '70000');

    // 提交订单
    await page.click('button:has-text("下单")');

    // 验证成功消息
    await expect(page.locator('text=/订单.*成功/')).toBeVisible({ timeout: 5000 });

    // 验证余额变化
    await expect(page.locator('text=/余额.*99,?300/')).toBeVisible({ timeout: 3000 });

    // 验证持仓显示
    await expect(page.locator('text=/BTC.*0\\.01/')).toBeVisible({ timeout: 3000 });
  });

  test('2. 限价卖出BTC', async ({ page }) => {
    // 先买入
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.selectOption('select:has-text("买入")', 'BUY');
    await page.fill('input[placeholder*="数量"]', '0.01');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 卖出
    await page.selectOption('select:has-text("买入")', 'SELL');
    await page.fill('input[placeholder*="价格"]', '72000');
    await page.click('button:has-text("下单")');

    // 验证余额增加
    await expect(page.locator('text=/余额.*100,?020/')).toBeVisible({ timeout: 3000 });
  });

  test('3. 市价买入', async ({ page }) => {
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.selectOption('select:has-text("限价")', 'MARKET');
    await page.fill('input[placeholder*="数量"]', '0.01');
    await page.click('button:has-text("下单")');

    await expect(page.locator('text=/订单.*成功/')).toBeVisible({ timeout: 5000 });
  });

  test('4. 余额不足', async ({ page }) => {
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.fill('input[placeholder*="数量"]', '2.0');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');

    await expect(page.locator('text=/Insufficient balance|余额不足/')).toBeVisible({ timeout: 5000 });
  });

  test('5. 持仓不足', async ({ page }) => {
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.selectOption('select:has-text("买入")', 'SELL');
    await page.fill('input[placeholder*="数量"]', '0.02');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');

    await expect(page.locator('text=/Insufficient position|持仓不足|No position/')).toBeVisible({ timeout: 5000 });
  });

  test('6. 多次买入累积持仓', async ({ page }) => {
    // 第一次买入
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.fill('input[placeholder*="数量"]', '0.01');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 第二次买入
    await page.fill('input[placeholder*="数量"]', '0.02');
    await page.fill('input[placeholder*="价格"]', '71000');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 验证持仓累积
    await expect(page.locator('text=/BTC.*0\\.03/')).toBeVisible({ timeout: 3000 });
  });

  test('7. 部分卖出持仓', async ({ page }) => {
    // 买入0.05
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.fill('input[placeholder*="数量"]', '0.05');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 卖出0.02
    await page.selectOption('select:has-text("买入")', 'SELL');
    await page.fill('input[placeholder*="数量"]', '0.02');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 验证剩余持仓
    await expect(page.locator('text=/BTC.*0\\.03/')).toBeVisible({ timeout: 3000 });
  });

  test('8. 多标的交易', async ({ page }) => {
    // 买入BTC
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.fill('input[placeholder*="数量"]', '0.01');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 买入ETH
    await page.fill('input[placeholder*="交易对"]', 'ETH-USDT');
    await page.fill('input[placeholder*="数量"]', '0.1');
    await page.fill('input[placeholder*="价格"]', '3500');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 验证持仓表显示2个标的
    await expect(page.locator('text=BTC')).toBeVisible();
    await expect(page.locator('text=ETH')).toBeVisible();
  });

  test('9. 买卖循环', async ({ page }) => {
    // 记录初始余额
    const initialBalance = await page.locator('text=/余额.*100,?000/').textContent();

    // 买入
    await page.fill('input[placeholder*="交易对"]', 'BTC-USDT');
    await page.fill('input[placeholder*="数量"]', '0.01');
    await page.fill('input[placeholder*="价格"]', '70000');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 卖出
    await page.selectOption('select:has-text("买入")', 'SELL');
    await page.click('button:has-text("下单")');
    await page.waitForTimeout(1000);

    // 验证余额接近初始值
    await expect(page.locator('text=/余额.*100,?000/')).toBeVisible({ timeout: 3000 });
  });
});
