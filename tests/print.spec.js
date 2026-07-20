const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('印刷', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); });
  });

  test('席替え結果がない状態で印刷するとエラーが表示され、window.printは呼ばれない', async ({ page }) => {
    const result = await page.evaluate(() => {
      let printCalled = false;
      window.print = () => { printCalled = true; }; // 実際の印刷ダイアログは開かせない
      app.printSeats();
      return { printCalled: printCalled, printEmptyError: app.printEmptyError };
    });
    expect(result.printCalled).toBe(false);
    expect(result.printEmptyError).toBe(true);
  });

  test('席替え後に印刷するとwindow.printが呼ばれる', async ({ page }) => {
    await page.evaluate(() => {
      app.seatsTable.splice(0, 1, ['A', 'B', '', '', '', '']);
      app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
      app.countSeats();
      return null;
    });
    await page.waitForTimeout(150); // watcherでstudentsName/genderArrayが更新されるのを待つ

    const result = await page.evaluate(() => {
      app.changeSeats();
      let printCalled = false;
      window.print = () => { printCalled = true; }; // 実際の印刷ダイアログは開かせない
      app.printSeats();
      return { printCalled: printCalled, printEmptyError: app.printEmptyError };
    });
    expect(result.printCalled).toBe(true);
    expect(result.printEmptyError).toBe(false);
  });

  test('印刷レイアウトに席替え後の生徒名・性別色・班の区切りが反映される', async ({ page }) => {
    await page.evaluate(() => {
      app.seatsTable.splice(0, 1, ['A', 'B', '', '', '', '']);
      app.genderTable.splice(0, 1, ['male', 'female', '', '', '', '']);
      app.countSeats();
      return null;
    });
    await page.waitForTimeout(150); // watcherでstudentsName/genderArrayが更新されるのを待つ

    const result = await page.evaluate(() => {
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
    expect(printArea.pagesCount).toBe(2); // 生徒側から見た図＋教壇側から見た図
    expect(printArea.seatsCount).toBe(36); // 6x6の全座席が描画されている
    expect(printArea.names).toEqual(['A', 'B']);
    expect(printArea.maleSeats).toBe(1);
    expect(printArea.femaleSeats).toBe(1);
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
});
