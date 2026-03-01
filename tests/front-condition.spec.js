const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

function findStudentPosition(nextSeatsTable, studentName) {
  for (let row = 0; row < nextSeatsTable.length; row++) {
    for (let col = 0; col < nextSeatsTable[row].length; col++) {
      if (nextSeatsTable[row][col] === studentName) {
        return [col, row];
      }
    }
  }
  return null;
}

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

test.describe('前に固定（frontConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('1人を前に固定 → 10回連続で最前列に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.frontConditions = ['山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '山田');
      expect(pos).not.toBeNull();
      expect(pos[1]).toBe(0);
    }
  });

  test('複数人を前に固定 → 10回連続で全員が最前列に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.frontConditions = ['山田', '坂本', '中川'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      for (const name of ['山田', '坂本', '中川']) {
        const pos = findStudentPosition(nextSeatsTable, name);
        expect(pos).not.toBeNull();
        expect(pos[1]).toBe(0);
      }
    }
  });
});

test.describe('前から2列目以内に固定（frontTwoRowsConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('1人を前から2列目以内に固定 → 10回連続で0〜1行目に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.frontTwoRowsConditions = ['永瀬'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '永瀬');
      expect(pos).not.toBeNull();
      expect(pos[1]).toBeLessThanOrEqual(1);
    }
  });

  test('複数人を前から2列目以内に固定 → 10回連続で全員が0〜1行目に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.frontTwoRowsConditions = ['永瀬', '高橋', '黒田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      for (const name of ['永瀬', '高橋', '黒田']) {
        const pos = findStudentPosition(nextSeatsTable, name);
        expect(pos).not.toBeNull();
        expect(pos[1]).toBeLessThanOrEqual(1);
      }
    }
  });
});
