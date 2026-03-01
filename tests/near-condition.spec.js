const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

// nextSeatsTable から生徒の座標 [col, row] を返す
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

// チェビシェフ距離（maxDistance と同じ計算）
function maxDistance(p1, p2) {
  return Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]));
}

// デモデータをセットし、Vue のリアクティブ更新を待つ
async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

// 席替えを実行し、結果を返す
async function runChangeSeats(page) {
  return await page.evaluate(() => {
    app.changeSeats();
    return app.nextSeatsTable;
  });
}

test.describe('近づける条件（nearConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('2人の生徒を0席以下に近づける → 隣接配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.nearConditions = [['山田', '坂本', 0]];
    });
    await page.waitForTimeout(50);

    const nextSeatsTable = await runChangeSeats(page);

    const posA = findStudentPosition(nextSeatsTable, '山田');
    const posB = findStudentPosition(nextSeatsTable, '坂本');
    expect(posA).not.toBeNull();
    expect(posB).not.toBeNull();
    // UI上「0席以下」→ 内部距離 0+1=1 → maxDistance ≤ 1
    expect(maxDistance(posA, posB)).toBeLessThanOrEqual(1);
  });

  test('2人の生徒を1席以下に近づける → チェビシェフ距離2以内', async ({ page }) => {
    await page.evaluate(() => {
      app.nearConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    const nextSeatsTable = await runChangeSeats(page);

    const posA = findStudentPosition(nextSeatsTable, '山田');
    const posB = findStudentPosition(nextSeatsTable, '坂本');
    expect(posA).not.toBeNull();
    expect(posB).not.toBeNull();
    // UI上「1席以下」→ 内部距離 1+1=2 → maxDistance ≤ 2
    expect(maxDistance(posA, posB)).toBeLessThanOrEqual(2);
  });

  test('2人の生徒を2席以下に近づける → チェビシェフ距離3以内', async ({ page }) => {
    await page.evaluate(() => {
      app.nearConditions = [['中川', '永瀬', 2]];
    });
    await page.waitForTimeout(50);

    const nextSeatsTable = await runChangeSeats(page);

    const posA = findStudentPosition(nextSeatsTable, '中川');
    const posB = findStudentPosition(nextSeatsTable, '永瀬');
    expect(posA).not.toBeNull();
    expect(posB).not.toBeNull();
    expect(maxDistance(posA, posB)).toBeLessThanOrEqual(3);
  });

  test('複数の近づける条件を同時に指定 → すべて成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.nearConditions = [
        ['山田', '坂本', 1],
        ['中川', '永瀬', 0],
      ];
    });
    await page.waitForTimeout(50);

    const nextSeatsTable = await runChangeSeats(page);

    const posYamada = findStudentPosition(nextSeatsTable, '山田');
    const posSakamoto = findStudentPosition(nextSeatsTable, '坂本');
    expect(maxDistance(posYamada, posSakamoto)).toBeLessThanOrEqual(2);

    const posNakagawa = findStudentPosition(nextSeatsTable, '中川');
    const posNagase = findStudentPosition(nextSeatsTable, '永瀬');
    expect(maxDistance(posNakagawa, posNagase)).toBeLessThanOrEqual(1);
  });

  test('席替えを10回実行しても毎回条件が成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.nearConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);

      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(posA).not.toBeNull();
      expect(posB).not.toBeNull();
      expect(maxDistance(posA, posB)).toBeLessThanOrEqual(2);
    }
  });
});
