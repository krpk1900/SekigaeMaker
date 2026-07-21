const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

// 男女2名ずつ・性別を市松に配置したフィクスチャ。
// 「男女の座席を固定」+「全員移動」のデフォルト条件でも、
// 男子同士（A・D）と女子同士（B・C）の交換で条件を満たせる（エラーにならない）
async function setupFourStudents(page) {
  await page.evaluate(() => {
    app.seatsTable.splice(0, 1, ['A', 'B', '', '', '', '']);
    app.seatsTable.splice(1, 1, ['C', 'D', '', '', '', '']);
    app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
    app.genderTable.splice(1, 1, ['female', 'male', '', '', '', '']);
    app.countSeats();
    return null;
  });
  await page.waitForTimeout(150); // watcherでstudentsName/genderArrayが更新されるのを待つ
}

// window.printをスタブしてprintSeats()を呼び、印刷が実行されたかを返す。
// printSeatsはドラッグ調整の再描画待ち（二段のnextTick）を挟むため、長めに待つ
async function stubAndPrint(page) {
  await page.evaluate(() => {
    window.printCalled = false;
    window.print = () => { window.printCalled = true; }; // 実際の印刷ダイアログは開かせない
    app.printSeats();
    return null;
  });
  await page.waitForTimeout(300);
  return await page.evaluate(() => {
    return { printCalled: window.printCalled, printEmptyError: app.printEmptyError };
  });
}

// SortableJS(swap:true)のドラッグ入れ替えを再現する。
// DOMの入れ替えに加えて、実物のonSort/onEndハンドラを呼んで同期待ちキューも再現する
async function simulateDragSwap(page, from, to) {
  await page.evaluate(({ from, to }) => {
    const fromSpan = document.getElementById(`nextSeatsRow-${from[0]}-${from[1]}`);
    const toSpan = document.getElementById(`nextSeatsRow-${to[0]}-${to[1]}`);
    const fromItem = fromSpan.firstElementChild;
    const toItem = toSpan.firstElementChild;
    const ph = document.createComment('ph');
    fromItem.replaceWith(ph);
    toItem.replaceWith(fromItem);
    ph.replaceWith(toItem);
    const sortable = Sortable.get(fromSpan);
    sortable.options.onSort();
    sortable.options.onEnd({ from: fromSpan, to: toSpan });
    return null;
  }, { from, to });
}

async function findSeatPos(page, name) {
  return await page.evaluate((name) => {
    for (let r = 0; r < app.nextSeatsTable.length; r++)
      for (let c = 0; c < app.nextSeatsTable[r].length; c++)
        if (app.nextSeatsTable[r][c] === name) return [r, c];
    return null;
  }, name);
}

test.describe('印刷', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); });
  });

  test('席替え結果がない状態で印刷するとエラーが表示され、window.printは呼ばれない', async ({ page }) => {
    const result = await stubAndPrint(page);
    expect(result.printCalled).toBe(false);
    expect(result.printEmptyError).toBe(true);
  });

  test('席替え後に印刷するとwindow.printが呼ばれる', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(150);
    const result = await stubAndPrint(page);
    const error = await page.evaluate(() => app.error);
    expect(error).toBe(false); // フィクスチャは条件を満たせる配置（エラー状態での検証にならないこと）
    expect(result.printCalled).toBe(true);
    expect(result.printEmptyError).toBe(false);
  });

  test('印刷レイアウトに席替え後の生徒名・性別色が反映される', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(150); // nextSeatsTableの再描画を待つ

    // #print-areaは画面上ではdisplay:noneのため、DOMの中身を直接検証する
    const printArea = await page.evaluate(() => {
      const area = document.getElementById('print-area');
      const pages = Array.from(area.querySelectorAll('.print-page'));
      const seats = Array.from(pages[0].querySelectorAll('.print-seat'));
      const names = seats.map(seat => seat.textContent.trim()).filter(Boolean);
      return {
        error: app.error,
        pagesCount: pages.length,
        seatsCount: seats.length,
        names: names.sort(),
        maleSeats: pages[0].querySelectorAll('.print-seat.male-seats').length,
        femaleSeats: pages[0].querySelectorAll('.print-seat.female-seats').length,
        hasBlackboard: pages[0].querySelector('.print-blackboard') !== null,
        hasCredit: area.querySelector('.print-credit') !== null,
        cols: area.style.getPropertyValue('--print-cols'),
        rows: area.style.getPropertyValue('--print-rows'),
      };
    });
    expect(printArea.error).toBe(false);
    expect(printArea.pagesCount).toBe(2); // 生徒側から見た図＋教壇側から見た図
    expect(printArea.seatsCount).toBe(36); // 6x6の全座席が描画されている
    expect(printArea.names).toEqual(['A', 'B', 'C', 'D']);
    expect(printArea.maleSeats).toBe(2);
    expect(printArea.femaleSeats).toBe(2);
    expect(printArea.hasBlackboard).toBe(true);
    expect(printArea.hasCredit).toBe(true);
    expect(printArea.cols).toBe('6');
    expect(printArea.rows).toBe('6');
  });

  test('班の区切りと班長の星が両ページに正しく反映される', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => {
      app.leaderConditions = ['A', ''];
      return null;
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(150);

    // 6x6・班2x3のとき：どの行も2列目・4列目の後ろに班の区切り（列インデックス1と3）、
    // 3行目の後ろに1つだけ行の区切りが入る。180度回転した2ページ目でも同じ位置になるはず
    const result = await page.evaluate(() => {
      const pages = document.getElementById('print-area').querySelectorAll('.print-page');
      const readGaps = (pageEl) => {
        const rows = Array.from(pageEl.querySelectorAll('.print-row'));
        const gapColsPerRow = rows.map(row =>
          Array.from(row.querySelectorAll('.print-seat'))
            .map((seat, i) => seat.classList.contains('print-group-gap-right') ? i : -1)
            .filter(i => i !== -1)
        );
        return {
          gapColsPerRow: gapColsPerRow,
          gapBottomCount: pageEl.querySelectorAll('.print-group-gap-bottom').length,
          leaderStars: pageEl.querySelectorAll('.print-leader-star').length,
        };
      };
      return { page1: readGaps(pages[0]), page2: readGaps(pages[1]) };
    });

    for (const pageResult of [result.page1, result.page2]) {
      expect(pageResult.gapColsPerRow).toHaveLength(6);
      for (const gapCols of pageResult.gapColsPerRow) {
        expect(gapCols).toEqual([1, 3]); // 2列目・4列目の後ろ（最後の列には付かない）
      }
      expect(pageResult.gapBottomCount).toBe(1); // 3行目の後ろのみ
      expect(pageResult.leaderStars).toBe(1); // 班長Aの星が1つ
    }
  });

  test('2ページ目（教壇側から見た図）は1ページ目を180度回転した配置になる', async ({ page }) => {
    // nextSeatsTableへ直接、位置が特定できる配置を書き込んで検証する
    await page.evaluate(() => {
      app.nextSeatsTable.splice(0, 1, ['A', 'B', '', '', '', 'C']);
      app.nextSeatsTable.splice(5, 1, ['D', '', '', '', '', 'E']);
      return null;
    });
    await page.waitForTimeout(150); // 再描画を待つ

    const result = await page.evaluate(() => {
      const pages = document.getElementById('print-area').querySelectorAll('.print-page');
      const readGrid = (pageEl) => Array.from(pageEl.querySelectorAll('.print-row'))
        .map(row => Array.from(row.querySelectorAll('.print-seat')).map(seat => seat.textContent.trim()));
      return { student: readGrid(pages[0]), teacher: readGrid(pages[1]) };
    });

    // 1ページ目は入力どおり
    expect(result.student[0]).toEqual(['A', 'B', '', '', '', 'C']);
    expect(result.student[5]).toEqual(['D', '', '', '', '', 'E']);
    // 2ページ目は行・列とも逆順（180度回転）
    expect(result.teacher[0]).toEqual(['E', '', '', '', '', 'D']);
    expect(result.teacher[5]).toEqual(['C', '', '', '', 'B', 'A']);
    // 2ページ目では黒板が座席より後（下端）に表示される
    const blackboardIsLast = await page.evaluate(() => {
      const page2 = document.getElementById('print-area').querySelectorAll('.print-page')[1];
      const children = Array.from(page2.children);
      return children[children.length - 1].classList.contains('print-blackboard');
    });
    expect(blackboardIsLast).toBe(true);
  });

  test('保存した結果を復元すると席替え後テーブルに入り、そのまま印刷できる', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(150);

    // 保存してから、席替え後テーブルを空にして（別の作業をした状態を再現）復元する
    const savedTable = await page.evaluate(() => {
      app.saveName = 'テスト保存';
      app.saveWithName(true);
      const saved = app.nextSeatsTable.map(row => row.slice());
      app.makeNextSeatsTable(); // 席替え後テーブルを空にする
      return saved;
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const list = app.getSavedList();
      app.restoreByName(list[0].id);
      return null;
    });
    await page.waitForTimeout(300); // watcherとnextTickでの席替え後テーブル反映を待つ

    const restored = await page.evaluate(() => app.nextSeatsTable.map(row => row.slice()));
    expect(restored).toEqual(savedTable); // 復元結果が席替え後テーブルに入っている

    const result = await stubAndPrint(page);
    expect(result.printCalled).toBe(true);
    expect(result.printEmptyError).toBe(false);
  });

  test('ドラッグの入れ替えが印刷前に反映され、印刷後も再度ドラッグできる', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(300); // 再描画とsetSortableJS（setTimeout 100ms）を待つ

    // 男子A・Dの位置を特定してドラッグ入れ替え
    const posA = await findSeatPos(page, 'A');
    const posD = await findSeatPos(page, 'D');
    await simulateDragSwap(page, posA, posD);

    const result1 = await stubAndPrint(page);
    expect(result1.printCalled).toBe(true);

    // データも印刷レイアウトも、ドラッグ後の配置（AとDが入れ替わった状態）になっている
    const afterFirst = await page.evaluate(({ posA, posD }) => {
      const page1 = document.getElementById('print-area').querySelectorAll('.print-page')[0];
      const grid = Array.from(page1.querySelectorAll('.print-row'))
        .map(row => Array.from(row.querySelectorAll('.print-seat')).map(seat => seat.textContent.trim()));
      return {
        seatAtA: app.nextSeatsTable[posA[0]][posA[1]],
        seatAtD: app.nextSeatsTable[posD[0]][posD[1]],
        printedAtA: grid[posA[0]][posA[1]],
        printedAtD: grid[posD[0]][posD[1]],
      };
    }, { posA, posD });
    expect(afterFirst.seatAtA).toBe('D');
    expect(afterFirst.seatAtD).toBe('A');
    expect(afterFirst.printedAtA).toBe('D');
    expect(afterFirst.printedAtD).toBe('A');

    // 印刷時の再描画後もSortableJSが再セットされ、続けてドラッグ調整できる
    const rebound = await page.evaluate((pos) => {
      const span = document.getElementById(`nextSeatsRow-${pos[0]}-${pos[1]}`);
      return Sortable.get(span) !== undefined;
    }, posA);
    expect(rebound).toBe(true);

    // 2回目のドラッグ（女子B・C）も印刷に反映される
    const posB = await findSeatPos(page, 'B');
    const posC = await findSeatPos(page, 'C');
    await simulateDragSwap(page, posB, posC);
    const result2 = await stubAndPrint(page);
    expect(result2.printCalled).toBe(true);
    const afterSecond = await page.evaluate(({ posB, posC }) => {
      return {
        seatAtB: app.nextSeatsTable[posB[0]][posB[1]],
        seatAtC: app.nextSeatsTable[posC[0]][posC[1]],
      };
    }, { posB, posC });
    expect(afterSecond.seatAtB).toBe('C');
    expect(afterSecond.seatAtC).toBe('B');
  });

  test('ドラッグ直後に同じ座席数の保存を復元しても、古いドラッグが復元結果に適用されない', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(300);

    // 保存してから、別の配置へドラッグ調整（未反映キューが残る状態を作る）
    const savedTable = await page.evaluate(() => {
      app.saveName = 'テスト保存';
      app.saveWithName(true);
      return app.nextSeatsTable.map(row => row.slice());
    });
    const posA = await findSeatPos(page, 'A');
    const posD = await findSeatPos(page, 'D');
    await simulateDragSwap(page, posA, posD);

    // 同じ座席数（6x6）の保存を復元 → 復元前のドラッグは破棄されるべき
    await page.evaluate(() => {
      const list = app.getSavedList();
      app.restoreByName(list[0].id);
      return null;
    });
    await page.waitForTimeout(300);

    const result = await stubAndPrint(page);
    expect(result.printCalled).toBe(true);
    // 印刷後も席替え後テーブルは保存時の配置のまま（古いドラッグが混入していない）
    const restored = await page.evaluate(() => app.nextSeatsTable.map(row => row.slice()));
    expect(restored).toEqual(savedTable);
  });

  test('ドラッグ直後に座席数を変えても、印刷がクラッシュせずエラー表示になる', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => { pageErrors.push(String(error)); });

    await setupFourStudents(page);
    await page.evaluate(() => { app.changeSeats(); return null; });
    await page.waitForTimeout(300);

    // ドラッグしてから座席テーブルを小さく作り直す（未反映キューの座標が範囲外になる状況）
    const posA = await findSeatPos(page, 'A');
    const posD = await findSeatPos(page, 'D');
    await simulateDragSwap(page, posA, posD);
    await page.evaluate(() => { app.seatsSizeY = 4; return null; });
    await page.waitForTimeout(300);

    // 席替え後テーブルは空になっているのでエラーダイアログが出る（クラッシュしない）
    const result = await stubAndPrint(page);
    expect(pageErrors).toEqual([]);
    expect(result.printCalled).toBe(false);
    expect(result.printEmptyError).toBe(true);
  });
});
