const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

// 座席表から生徒を削除した後も条件フォームには古い名前が残る（stale条件）。
// stale条件はクラッシュや幽霊配置を起こさず、単に無視されることを検証する。

async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

// 座席表から生徒を1人削除する（watcherがstudentsName等を更新するのを待つ）
async function deleteStudent(page, name) {
  await page.evaluate((studentName) => {
    for (let row = 0; row < app.seatsTable.length; row++) {
      const col = app.seatsTable[row].indexOf(studentName);
      if (col !== -1) {
        app.seatsTable[row].splice(col, 1, '');
        return;
      }
    }
  }, name);
  await page.waitForTimeout(150);
}

// 席替えを実行し、クラッシュの有無と結果の状態を返す
async function runChangeSeats(page) {
  return page.evaluate(() => {
    let threw = false;
    try { app.changeSeats(); } catch (e) { threw = true; }
    const placed = app.nextSeatsTable.flat().filter(Boolean);
    return {
      threw,
      error: app.error,
      placedCount: placed.length,
      placedNames: placed,
      rowLengths: app.nextSeatsTable.map(row => row.length),
      hasUndefined: app.nextSeatsTable.flat().some(cell => cell === undefined || cell === null),
    };
  });
}

test.describe('削除済み生徒が条件に残っている場合（stale条件）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('班長条件に削除済み生徒が残っていても（男女固定OFF・全員移動ON）クラッシュせず席替えできる', async ({ page }) => {
    // 別本はデモデータで班長条件に入っている。男女固定OFF＋全員移動ONはcheckDifferentがクラッシュしていた経路
    await page.evaluate(() => {
      app.isFixGender = false;
      app.isAllDifferent = true;
    });
    await deleteStudent(page, '別本');

    const result = await runChangeSeats(page);
    expect(result.threw).toBe(false);
    expect(result.error).toBe(false);
    expect(result.placedCount).toBe(35); // 36席から1人削除
    expect(result.placedNames).not.toContain('別本'); // 幽霊配置されない
  });

  test('固定座席条件に削除済み生徒が残っていてもクラッシュせず、座席が空振り消費されない', async ({ page }) => {
    // 削除済み生徒の固定条件は座席だけを消費し、最後の生徒で座席が枯渇してクラッシュしていた経路
    await page.evaluate(() => {
      app.fixConditions = [['山田', 1, 1], ['', '', '']];
    });
    await deleteStudent(page, '山田');

    const result = await runChangeSeats(page);
    expect(result.threw).toBe(false);
    expect(result.error).toBe(false);
    expect(result.placedCount).toBe(35);
    expect(result.placedNames).not.toContain('山田');
  });

  test('範囲外の座席を指す固定座席条件が残っていてもクラッシュせず、結果の行が壊れない', async ({ page }) => {
    // 座席数を縮小するとv-selectに縮小前の行・列が残る。範囲外への配置は疎な行（undefinedの穴）を作っていた
    const result = await page.evaluate(() => {
      app.fixConditions = [['平野', 9, 9], ['', '', '']]; // 6x6グリッドでは範囲外
      let threw = false;
      try { app.changeSeats(); } catch (e) { threw = true; }
      const placed = app.nextSeatsTable.flat().filter(Boolean);
      return {
        threw,
        error: app.error,
        placedCount: placed.length,
        hasHirano: placed.includes('平野'),
        rowLengths: app.nextSeatsTable.map(row => row.length),
        hasUndefined: app.nextSeatsTable.flat().some(cell => cell === undefined || cell === null),
      };
    });
    expect(result.threw).toBe(false);
    expect(result.error).toBe(false);
    expect(result.placedCount).toBe(36);
    expect(result.hasHirano).toBe(true); // 条件は無視され、通常の生徒として配置される
    expect(result.rowLengths).toEqual([6, 6, 6, 6, 6, 6]); // 行が伸びない
    expect(result.hasUndefined).toBe(false); // undefinedの穴がない
  });

  test('行・列が未入力の固定座席条件が残っていてもクラッシュしない', async ({ page }) => {
    // 生徒だけ選んで行・列が未選択のままだと ''-1 = -1 で範囲外アクセスになっていた
    const result = await page.evaluate(() => {
      app.fixConditions = [['平野', '', ''], ['', '', '']];
      let threw = false;
      try { app.changeSeats(); } catch (e) { threw = true; }
      return { threw, error: app.error, placedCount: app.nextSeatsTable.flat().filter(Boolean).length };
    });
    expect(result.threw).toBe(false);
    expect(result.error).toBe(false);
    expect(result.placedCount).toBe(36);
  });

  test('最前列条件に削除済み生徒が残っていてもクラッシュせず席替えできる', async ({ page }) => {
    await page.evaluate(() => {
      app.frontConditions = ['山田', ''];
    });
    await deleteStudent(page, '山田');

    const result = await runChangeSeats(page);
    expect(result.threw).toBe(false);
    expect(result.error).toBe(false);
    expect(result.placedCount).toBe(35);
    expect(result.placedNames).not.toContain('山田');
  });

  test('近づける条件の相手が存在しない生徒でもクラッシュせず席替えできる', async ({ page }) => {
    const result = await page.evaluate(() => {
      app.nearConditions = [['山田', '存在しない生徒', 0], ['', '', '']];
      let threw = false;
      try { app.changeSeats(); } catch (e) { threw = true; }
      const placed = app.nextSeatsTable.flat().filter(Boolean);
      return {
        threw,
        error: app.error,
        placedCount: placed.length,
        hasGhost: placed.includes('存在しない生徒'),
      };
    });
    expect(result.threw).toBe(false);
    expect(result.error).toBe(false);
    expect(result.placedCount).toBe(36);
    expect(result.hasGhost).toBe(false);
  });
});
