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

  test('最後列の座席数を超える人数を固定 → クラッシュせずエラー扱いになる', async ({ page }) => {
    // 6×6では最後列は6席。7人を固定すると配置不能になり、
    // 修正前は空配列をshiftしてundefinedを参照しクラッシュしていた。
    const names = ['別本', '山田', '平野', '山口', '高松', '寺井', '山村'];
    const result = await page.evaluate((names) => {
      app.backConditions = names;
      let threw = false;
      try {
        app.changeSeats();
      } catch (e) {
        threw = true;
      }
      return { threw, error: app.error };
    }, names);

    expect(result.threw).toBe(false);
    expect(result.error).toBe(true);
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

  test('後ろ2列の座席数を超える人数を固定 → クラッシュせずエラー扱いになる', async ({ page }) => {
    // 6×6では後ろ2列の座席は12席。13人を固定すると配置不能になり、
    // 修正前は空配列をshiftしてundefinedを参照しクラッシュしていた。
    const names = ['別本', '山田', '平野', '山口', '高松', '寺井', '山村', '坂本', '浦山', '栗原', '谷井', '柳澤', '中川'];
    const result = await page.evaluate((names) => {
      app.backTwoRowsConditions = names;
      let threw = false;
      try {
        app.changeSeats();
      } catch (e) {
        threw = true;
      }
      return { threw, error: app.error };
    }, names);

    expect(result.threw).toBe(false); // クラッシュしない
    expect(result.error).toBe(true);  // 配置不能なのでエラー表示になる
  });
});
