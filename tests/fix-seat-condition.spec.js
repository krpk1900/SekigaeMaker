const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

async function runChangeSeats(page) {
  return await page.evaluate(() => {
    app.changeSeats();
    return app.nextSeatsTable;
  });
}

test.describe('固定座席（fixConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('1人を指定座席に固定 → 10回連続でその座席に配置される', async ({ page }) => {
    // fixConditions: [studentName, row(1-indexed), col(1-indexed)]
    await page.evaluate(() => {
      app.fixConditions = [['山田', 3, 4]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      // row=3, col=4 は 0-indexed で [2][3]
      expect(nextSeatsTable[2][3]).toBe('山田');
    }
  });

  test('複数人を指定座席に固定 → 10回連続で全員がその座席に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.fixConditions = [
        ['山田', 1, 1],
        ['坂本', 6, 6],
        ['中川', 3, 3],
      ];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      expect(nextSeatsTable[0][0]).toBe('山田');
      expect(nextSeatsTable[5][5]).toBe('坂本');
      expect(nextSeatsTable[2][2]).toBe('中川');
    }
  });
});
