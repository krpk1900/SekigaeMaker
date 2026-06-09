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
});
