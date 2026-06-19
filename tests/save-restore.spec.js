const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('保存・復元', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); });
  });

  test('「近づける」条件で配置した生徒の性別が、保存→復元後も失われない', async ({ page }) => {
    // 「近づける」はchangeNearFarSeats経由で配置される。この経路はshuffleSeats/placeLeaders
    // と違い性別を記録していなかったため、旧実装では保存→復元で席の色が消えていた。
    // 班長(placeLeaders)経由で配置されないよう、leaderConditionsは空のままにする。
    const result = await page.evaluate(() => {
      app.seatsTable.splice(0, 1, ['A', 'B', '', '', '', '']);
      app.seatsTable.splice(1, 1, ['C', 'D', '', '', '', '']);
      app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
      app.genderTable.splice(1, 1, ['female', 'male', '', '', '', '']);
      app.countSeats();
      return null;
    });
    await page.waitForTimeout(150); // watcherでstudentsName/genderArray/seatsTableIndexが更新されるのを待つ

    const missingGender = await page.evaluate(() => {
      app.isFixGender = true;
      app.nearConditions = [['A', 'B', 0], ['', '', '']]; // AとBを近づける
      app.changeSeats();

      // 保存
      app.saveName = 'テスト保存';
      app.saveWithName(true);

      // 一覧から復元
      const list = app.getSavedList();
      app.restoreByName(list[0].id);

      // 復元後、生徒がいる席はすべて性別が設定されている（''がない）はず
      let missing = 0;
      for (let row = 0; row < app.seatsSizeY; row++) {
        for (let col = 0; col < app.seatsSizeX; col++) {
          if (app.seatsTable[row][col] !== '' && app.genderTable[row][col] === '') {
            missing += 1;
          }
        }
      }
      return missing;
    });

    expect(missingGender).toBe(0); // 旧実装ではA・Bの2席が''になり 2 になる
  });

  test('復元直後、空の「席替え後」テーブルの各席は無色（off-seats）で表示される', async ({ page }) => {
    // restoreByNameはnextSeatsTableを空にするが、getColorByNextSeatが空席にも
    // genderTableの色を付けていたため、「名前なし＋色つき」のセルが残っていた。
    const coloredEmptySeats = await page.evaluate(() => {
      app.seatsTable.splice(0, 1, ['A', 'B', '', '', '', '']);
      app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
      app.countSeats();
      app.isFixGender = true;
      app.changeSeats();

      app.saveName = 'テスト保存';
      app.saveWithName(true);
      const list = app.getSavedList();
      app.restoreByName(list[0].id); // nextSeatsTableは空になる

      // 空の結果テーブルの全席が off-seats（無色）であること
      let colored = 0;
      for (let row = 0; row < app.seatsSizeY; row++) {
        for (let col = 0; col < app.seatsSizeX; col++) {
          const name = app.nextSeatsTable[row][col];
          if (name === '' && app.getColorByNextSeat(name, col, row) !== 'off-seats') {
            colored += 1;
          }
        }
      }
      return colored;
    });

    expect(coloredEmptySeats).toBe(0); // 旧実装では色が残り 0 より大きくなる
  });
});
