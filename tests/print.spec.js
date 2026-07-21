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

test.describe('印刷', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); });
  });

  test('座席が空の状態で印刷するとエラーが表示され、window.printは呼ばれない', async ({ page }) => {
    await page.evaluate(() => {
      window.printCalled = false;
      window.print = () => { window.printCalled = true; }; // 実際の印刷ダイアログは開かせない
      app.printSeats();
      return null;
    });
    await page.waitForTimeout(100); // printSeatsは$nextTick経由で印刷するため待つ
    const result = await page.evaluate(() => {
      return { printCalled: window.printCalled, printEmptyError: app.printEmptyError };
    });
    expect(result.printCalled).toBe(false);
    expect(result.printEmptyError).toBe(true);
  });

  test('席替え後に印刷するとwindow.printが呼ばれる', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => {
      app.changeSeats();
      window.printCalled = false;
      window.print = () => { window.printCalled = true; }; // 実際の印刷ダイアログは開かせない
      app.printSeats();
      return null;
    });
    await page.waitForTimeout(100); // printSeatsは$nextTick経由で印刷するため待つ
    const result = await page.evaluate(() => {
      return { printCalled: window.printCalled, printEmptyError: app.printEmptyError, error: app.error };
    });
    expect(result.error).toBe(false); // フィクスチャは条件を満たせる配置（エラー状態での検証にならないこと）
    expect(result.printCalled).toBe(true);
    expect(result.printEmptyError).toBe(false);
  });

  test('印刷レイアウトに席替え後の生徒名・性別色・班の区切りが反映される', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => {
      app.changeSeats();
      return null;
    });
    await page.waitForTimeout(150); // nextSeatsTableの再描画を待つ

    // #print-areaは画面上ではdisplay:noneのため、DOMの中身を直接検証する
    const printArea = await page.evaluate(() => {
      const area = document.getElementById('print-area');
      const pages = Array.from(area.querySelectorAll('.print-page'));
      const seats = Array.from(pages[0].querySelectorAll('.print-seat'));
      const names = seats.map(seat => seat.textContent.trim()).filter(Boolean);
      const maleSeats = pages[0].querySelectorAll('.print-seat.male-seats').length;
      const femaleSeats = pages[0].querySelectorAll('.print-seat.female-seats').length;
      return {
        error: app.error,
        pagesCount: pages.length,
        seatsCount: seats.length,
        names: names.sort(),
        maleSeats: maleSeats,
        femaleSeats: femaleSeats,
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

  test('席替え結果がないとき（復元直後など）は今の座席を印刷できる', async ({ page }) => {
    // restoreByNameは復元結果をseatsTableへ書き込み、nextSeatsTableは空になる。
    // その状態でも今の座席がフォールバックとして印刷できることを検証する
    await setupFourStudents(page);
    await page.evaluate(() => {
      window.printCalled = false;
      window.print = () => { window.printCalled = true; }; // 実際の印刷ダイアログは開かせない
      app.printSeats();
      return null;
    });
    await page.waitForTimeout(100); // printSeatsは$nextTick経由で印刷するため待つ

    const result = await page.evaluate(() => {
      const page1 = document.getElementById('print-area').querySelectorAll('.print-page')[0];
      const names = Array.from(page1.querySelectorAll('.print-seat'))
        .map(seat => seat.textContent.trim()).filter(Boolean);
      return {
        printCalled: window.printCalled,
        printEmptyError: app.printEmptyError,
        names: names.sort(),
        maleSeats: page1.querySelectorAll('.print-seat.male-seats').length,
        femaleSeats: page1.querySelectorAll('.print-seat.female-seats').length,
      };
    });
    expect(result.printCalled).toBe(true);
    expect(result.printEmptyError).toBe(false);
    expect(result.names).toEqual(['A', 'B', 'C', 'D']); // 今の座席の内容が印刷される
    expect(result.maleSeats).toBe(2);
    expect(result.femaleSeats).toBe(2);
  });

  test('ドラッグで調整した入れ替えが、印刷前にnextSeatsTableへ反映される', async ({ page }) => {
    await setupFourStudents(page);
    await page.evaluate(() => {
      app.changeSeats();
      return null;
    });
    await page.waitForTimeout(300); // 再描画とsetSortableJS（setTimeout 100ms）を待つ

    // 同性2人（男子A・D）の位置を特定し、SortableJSのドラッグ入れ替えを再現する。
    // DOMの入れ替えに加えて、実物のonSort/onEndハンドラを呼んで同期待ちキューも再現する
    const swapped = await page.evaluate(() => {
      const findPos = (name) => {
        for (let r = 0; r < app.nextSeatsTable.length; r++)
          for (let c = 0; c < app.nextSeatsTable[r].length; c++)
            if (app.nextSeatsTable[r][c] === name) return [r, c];
        return null;
      };
      const [ar, ac] = findPos('A');
      const [dr, dc] = findPos('D');
      const fromSpan = document.getElementById(`nextSeatsRow-${ar}-${ac}`);
      const toSpan = document.getElementById(`nextSeatsRow-${dr}-${dc}`);
      // swap:trueと同じDOM入れ替え
      const fromItem = fromSpan.firstElementChild;
      const toItem = toSpan.firstElementChild;
      const ph = document.createComment('ph');
      fromItem.replaceWith(ph);
      toItem.replaceWith(fromItem);
      ph.replaceWith(toItem);
      // 実物のイベントハンドラを呼ぶ（closure内のisReverseSeats・キューに反映される）
      const sortable = Sortable.get(fromSpan);
      sortable.options.onSort();
      sortable.options.onEnd({ from: fromSpan, to: toSpan });
      return { a: [ar, ac], d: [dr, dc] };
    });

    await page.evaluate(() => {
      window.printCalled = false;
      window.print = () => { window.printCalled = true; }; // 実際の印刷ダイアログは開かせない
      app.printSeats();
      return null;
    });
    await page.waitForTimeout(100); // printSeatsは$nextTick経由で印刷するため待つ

    const result = await page.evaluate(({ a, d }) => {
      const page1 = document.getElementById('print-area').querySelectorAll('.print-page')[0];
      const grid = Array.from(page1.querySelectorAll('.print-row'))
        .map(row => Array.from(row.querySelectorAll('.print-seat')).map(seat => seat.textContent.trim()));
      return {
        printCalled: window.printCalled,
        seatAtA: app.nextSeatsTable[a[0]][a[1]],
        seatAtD: app.nextSeatsTable[d[0]][d[1]],
        printedAtA: grid[a[0]][a[1]],
        printedAtD: grid[d[0]][d[1]],
      };
    }, swapped);

    expect(result.printCalled).toBe(true);
    // データも印刷レイアウトも、ドラッグ後の配置（AとDが入れ替わった状態）になっている
    expect(result.seatAtA).toBe('D');
    expect(result.seatAtD).toBe('A');
    expect(result.printedAtA).toBe('D');
    expect(result.printedAtD).toBe('A');
  });
});
