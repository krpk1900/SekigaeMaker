const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('同名の生徒（uniqueKey）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
  });

  test('同名の生徒がいてもキーが衝突しない', async ({ page }) => {
    const keys = await page.evaluate(() => {
      // 「田中」「佐藤」を重複させた座席テーブル
      app.nextSeatsTable = [
        ['田中', '佐藤', '田中'],
        ['佐藤', '鈴木', '田中'],
      ];
      const keys = [];
      for (let row = 0; row < app.nextSeatsTable.length; row++) {
        for (let col = 0; col < app.nextSeatsTable[row].length; col++) {
          keys.push(app.uniqueKey(app.nextSeatsTable[row][col], row, col));
        }
      }
      return keys;
    });

    // 修正前は同名のキーが衝突して重複していた
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('一意な名前は名前ベースのキー（#0）になりアニメーション追跡が保たれる', async ({ page }) => {
    const result = await page.evaluate(() => {
      app.nextSeatsTable = [['山田', '', '佐藤']];
      return {
        yamada: app.uniqueKey('山田', 0, 0),
        empty: app.uniqueKey('', 0, 1),
        sato: app.uniqueKey('佐藤', 0, 2),
      };
    });

    expect(result.yamada).toBe('山田#0');
    expect(result.sato).toBe('佐藤#0');
    expect(result.empty).toBe('nextSeatsRow-0-1'); // 空席は座標ベース
  });

  test('同名の生徒でも座席ごとにクリックで性別の色が切り替わる', async ({ page }) => {
    // 2行目に「田中」を2人並べる（左上のデモ色セルを避ける）
    await page.evaluate(() => {
      app.seatsTable.splice(1, 1, ['田中', '田中', '', '', '', '']);
      app.genderTable.splice(1, 1, ['male', 'male', '', '', '', '']);
      app.countSeats();
    });
    await page.waitForTimeout(100);

    // クリック相当：2人目（col=1, row=1）の性別をトグル
    await page.evaluate(() => { app.toggleGender(1, 1); });
    await page.waitForTimeout(100);

    // 描画された入力テーブル2行目の各座席の色クラスを取得
    const classes = await page.evaluate(() => {
      const rows = document.querySelectorAll('.seats-scroll-container li');
      const inputs = rows[1].querySelectorAll('input.seat');
      return [inputs[0].className, inputs[1].className];
    });

    expect(classes[0]).toContain('male-seats');   // 1人目は変わらない
    expect(classes[1]).toContain('female-seats'); // 修正前は male-seats のまま（1人目を参照していた）
  });
});
