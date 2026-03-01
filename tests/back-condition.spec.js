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

test.describe('後ろに固定（backConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('1人を後ろに固定 → 10回連続で最後列に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.backConditions = ['山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '山田');
      expect(pos).not.toBeNull();
      const lastRow = nextSeatsTable.length - 1;
      expect(pos[1]).toBe(lastRow);
    }
  });

  test('複数人を後ろに固定 → 10回連続で全員が最後列に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.backConditions = ['山田', '坂本', '中川'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const lastRow = nextSeatsTable.length - 1;
      for (const name of ['山田', '坂本', '中川']) {
        const pos = findStudentPosition(nextSeatsTable, name);
        expect(pos).not.toBeNull();
        expect(pos[1]).toBe(lastRow);
      }
    }
  });
});

test.describe('後ろから2列目以内に固定（backTwoRowsConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('1人を後ろから2列目以内に固定 → 10回連続で後ろ2行に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.backTwoRowsConditions = ['山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '山田');
      expect(pos).not.toBeNull();
      const lastRow = nextSeatsTable.length - 1;
      expect(pos[1]).toBeGreaterThanOrEqual(lastRow - 1);
    }
  });

  test('複数人を後ろから2列目以内に固定 → 10回連続で全員が後ろ2行に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.backTwoRowsConditions = ['山田', '坂本', '中川'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const lastRow = nextSeatsTable.length - 1;
      for (const name of ['山田', '坂本', '中川']) {
        const pos = findStudentPosition(nextSeatsTable, name);
        expect(pos).not.toBeNull();
        expect(pos[1]).toBeGreaterThanOrEqual(lastRow - 1);
      }
    }
  });
});
