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
    return {
      nextSeatsTable: app.nextSeatsTable,
      nextGenderTable: app.nextGenderTable,
    };
  });
}

test.describe('性別の並びを固定（isFixGender）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('性別固定ON → 10回連続で各席の性別パターンが維持される', async ({ page }) => {
    const originalGenderTable = await page.evaluate(() => app.genderTable);

    await page.evaluate(() => {
      app.isFixGender = true;
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextGenderTable } = await runChangeSeats(page);
      for (let row = 0; row < originalGenderTable.length; row++) {
        for (let col = 0; col < originalGenderTable[row].length; col++) {
          expect(nextGenderTable[row][col]).toBe(originalGenderTable[row][col]);
        }
      }
    }
  });
});
