const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

// 班長Aと非班長Bをドラッグ＆ドロップで並び替えたとき、星(☆)が
// 名前(A)に追従するかを検証するリグレッションテスト。
// SortableJS(swap:true)は各セル(span)の「直接の子=ドラッグ可能アイテム」を
// コンテナ間で入れ替えるため、その挙動をDOM操作で直接再現して確認する。
test('班長Aを非班長Bと並び替えても星は班長Aに付いたままになる', async ({ page }) => {
  await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    app.leaderConditions = ['山田'];
    app.landing = false;
    app.drawer = false;
    app.showNewFeatureModal = false;
    app.updateInformation = false;
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => { app.changeSeats(); app.drawer = false; });
  await page.waitForTimeout(300);

  // 班長(山田)の位置を取得
  const pos = await page.evaluate(() => {
    for (let r = 0; r < app.nextSeatsTable.length; r++)
      for (let c = 0; c < app.nextSeatsTable[r].length; c++)
        if (app.nextSeatsTable[r][c] === '山田') return [r, c];
    return null;
  });
  expect(pos).not.toBeNull();
  const [r, c] = pos;

  // 同じ行にいる別の生徒（非班長）を入れ替え相手に選ぶ
  const target = await page.evaluate(({ r, c }) => {
    const seats = app.nextSeatsTable;
    for (let cc = 0; cc < seats[r].length; cc++) {
      if (cc !== c && seats[r][cc] && seats[r][cc] !== '山田') return [r, cc];
    }
    return null;
  }, { r, c });
  expect(target).not.toBeNull();
  const [tr, tc] = target;

  // SortableJS swap:true の入れ替えを再現
  await page.evaluate(({ r, c, tr, tc }) => {
    const fromSpan = document.getElementById(`nextSeatsRow-${r}-${c}`);
    const toSpan = document.getElementById(`nextSeatsRow-${tr}-${tc}`);
    const fromItem = fromSpan.firstElementChild;
    const toItem = toSpan.firstElementChild;
    const ph = document.createComment('ph');
    fromItem.replaceWith(ph);
    toItem.replaceWith(fromItem);
    ph.replaceWith(toItem);
  }, { r, c, tr, tc });
  await page.waitForTimeout(200);

  const after = await page.evaluate(({ r, c, tr, tc }) => {
    function cellInfo(rr, cc) {
      const span = document.getElementById(`nextSeatsRow-${rr}-${cc}`);
      const input = span.querySelector('input');
      const star = span.querySelector('.mdi-star');
      return { name: input ? input.value : null, hasStar: !!star };
    }
    return { fromCell: cellInfo(r, c), toCell: cellInfo(tr, tc) };
  }, { r, c, tr, tc });

  // 星は「山田」と表示されているセルに付いていなければならない
  const yamadaCell = after.fromCell.name === '山田' ? after.fromCell : after.toCell;
  const otherCell = after.fromCell.name === '山田' ? after.toCell : after.fromCell;

  expect(yamadaCell.name).toBe('山田');
  expect(yamadaCell.hasStar).toBe(true);
  expect(otherCell.hasStar).toBe(false);
});
