const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

test.describe('全員移動（isAllDifferent）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('全員移動ON → 10回連続で全員が元の席と異なる席に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.isAllDifferent = true;
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        const beforeTable = app.seatsTable.map(row => [...row]);
        app.changeSeats();
        const afterTable = app.nextSeatsTable;
        // 各生徒が元の席と異なる位置にいるか確認
        let allDifferent = true;
        for (let row = 0; row < beforeTable.length; row++) {
          for (let col = 0; col < beforeTable[row].length; col++) {
            const student = beforeTable[row][col];
            if (student && afterTable[row][col] === student) {
              allDifferent = false;
            }
          }
        }
        return allDifferent;
      });
      expect(result).toBe(true);
    }
  });
});
