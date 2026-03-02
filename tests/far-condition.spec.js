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

function maxDistance(p1, p2) {
  return Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]));
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

test.describe('離す条件（farConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('0席以上離す → 10回連続でチェビシェフ距離1以上', async ({ page }) => {
    await page.evaluate(() => {
      app.farConditions = [['山田', '坂本', 0]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(posA).not.toBeNull();
      expect(posB).not.toBeNull();
      expect(maxDistance(posA, posB)).toBeGreaterThanOrEqual(1);
    }
  });

  test('1席以上離す → 10回連続でチェビシェフ距離2以上', async ({ page }) => {
    await page.evaluate(() => {
      app.farConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(posA).not.toBeNull();
      expect(posB).not.toBeNull();
      expect(maxDistance(posA, posB)).toBeGreaterThanOrEqual(2);
    }
  });

  test('2席以上離す → 10回連続でチェビシェフ距離3以上', async ({ page }) => {
    await page.evaluate(() => {
      app.farConditions = [['中川', '永瀬', 2]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '中川');
      const posB = findStudentPosition(nextSeatsTable, '永瀬');
      expect(posA).not.toBeNull();
      expect(posB).not.toBeNull();
      expect(maxDistance(posA, posB)).toBeGreaterThanOrEqual(3);
    }
  });

  test('複数条件の同時指定 → 10回連続ですべて成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.farConditions = [
        ['山田', '坂本', 1],
        ['中川', '永瀬', 0],
      ];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const posYamada = findStudentPosition(nextSeatsTable, '山田');
      const posSakamoto = findStudentPosition(nextSeatsTable, '坂本');
      expect(maxDistance(posYamada, posSakamoto)).toBeGreaterThanOrEqual(2);
      const posNakagawa = findStudentPosition(nextSeatsTable, '中川');
      const posNagase = findStudentPosition(nextSeatsTable, '永瀬');
      expect(maxDistance(posNakagawa, posNagase)).toBeGreaterThanOrEqual(1);
    }
  });
});
