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
        // 配置された各座席で、生徒の性別が座席の性別(genderTable)と一致しているか
        let genderOk = true;
        const names = [];
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const name = app.nextSeatsTable[row][col];
            names.push(name);
            // nextGenderTable(配置後の性別)が、元のgenderTable(座席固定の性別)と一致
            if (app.nextGenderTable[row][col] !== app.genderTable[row][col]) genderOk = false;
          }
        }
        names.sort();
        return { error: app.error, genderOk, names };
      });

      expect(result.error).toBe(false);   // 修正前はtrue（無限リスタート→エラー）
      expect(result.genderOk).toBe(true); // 各席の性別が保たれている
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
