const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('同名・異性別の生徒（性別固定）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
  });

  test('男の山田と女の山田がいても席替えがエラーにならず、性別配置が保たれる', async ({ page }) => {
    await page.evaluate(() => {
      // 男2(山田/鈴木) 女2(佐藤/山田)。山田は男女1人ずつ
      app.seatsTable.splice(0, 1, ['山田', '佐藤', '', '', '', '']);
      app.seatsTable.splice(1, 1, ['山田', '鈴木', '', '', '', '']);
      app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
      app.genderTable.splice(1, 1, ['female', 'male', '', '', '', '']);
      app.countSeats();
    });
    await page.waitForTimeout(150); // watcherでstudentsName/genderArray/seatsTableIndexが更新されるのを待つ

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        app.error = false;
        app.changeSeats();
        // 男性席・女性席それぞれに配置された生徒名を集める。
        // 同名(山田)が男女に1人ずついるためname→性別マップは作れないが、
        // 「男性席に座る生徒の集合 == 男性の生徒の集合」を検証すれば誤配置を確実に検出できる。
        const maleSeatNames = [];
        const femaleSeatNames = [];
        const names = [];
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const name = app.nextSeatsTable[row][col];
            if (name === '') continue;
            names.push(name);
            if (app.genderTable[row][col] === 'male') maleSeatNames.push(name);
            else if (app.genderTable[row][col] === 'female') femaleSeatNames.push(name);
          }
        }
        names.sort();
        maleSeatNames.sort();
        femaleSeatNames.sort();
        return { error: app.error, maleSeatNames, femaleSeatNames, names };
      });

      expect(result.error).toBe(false); // 修正前はtrue（無限リスタート→エラー）
      // 男性席には男性の生徒(山田・鈴木)、女性席には女性の生徒(佐藤・山田)だけが座る
      expect(result.maleSeatNames).toEqual(['山田', '鈴木'].sort());
      expect(result.femaleSeatNames).toEqual(['佐藤', '山田'].sort());
      // 4人全員が配置されている（同名の山田2人を含む）
      expect(result.names).toEqual(['佐藤', '山田', '山田', '鈴木'].sort());
    }
  });

  test('席替え後の結果テーブルで、2人の山田が男女それぞれの色で表示される', async ({ page }) => {
    await page.evaluate(() => {
      app.seatsTable.splice(0, 1, ['山田', '佐藤', '', '', '', '']);
      app.seatsTable.splice(1, 1, ['山田', '鈴木', '', '', '', '']);
      app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
      app.genderTable.splice(1, 1, ['female', 'male', '', '', '', '']);
      app.countSeats();
    });
    await page.waitForTimeout(150);

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        app.error = false;
        app.changeSeats();
        // 結果テーブルの山田2人の色クラスを、配置座標から取得
        const colors = [];
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            if (app.nextSeatsTable[r][c] === '山田') {
              colors.push(app.getColorByNextSeat('山田', c, r));
            }
          }
        }
        return colors.sort();
      });
      // 修正前は ['male-seats','male-seats']（両方とも1人目=男で表示）になっていた
      expect(result).toEqual(['female-seats', 'male-seats']);
    }
  });
});
