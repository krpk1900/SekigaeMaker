const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

async function runChangeSeats(page) {
  return await page.evaluate(() => {
    // 席替え前に「生徒名→本来の性別」を入力テーブルから記録する（genderTableはchangeSeatsで変化しない）
    const studentGenderMap = {};
    for (let row = 0; row < app.seatsTable.length; row++) {
      for (let col = 0; col < app.seatsTable[row].length; col++) {
        const name = app.seatsTable[row][col];
        if (name) studentGenderMap[name] = app.genderTable[row][col];
      }
    }
    app.changeSeats();
    return {
      nextSeatsTable: app.nextSeatsTable,
      // 結果の各席に「実際に配置された生徒の本来の性別」を割り当てる。
      // 席の固定性別(genderTable)ではなく生徒由来の値なので、誤配置があれば検出できる
      placedGenderTable: app.nextSeatsTable.map(rowArr =>
        rowArr.map(name => name === '' ? '' : studentGenderMap[name])
      ),
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
      // 各席に配置された生徒の本来の性別が、その席に固定された性別と一致していることを検証する
      const { placedGenderTable } = await runChangeSeats(page);
      for (let row = 0; row < originalGenderTable.length; row++) {
        for (let col = 0; col < originalGenderTable[row].length; col++) {
          expect(placedGenderTable[row][col]).toBe(originalGenderTable[row][col]);
        }
      }
    }
  });
});
