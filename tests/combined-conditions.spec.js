const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = `file://${path.resolve(__dirname, '../index.html')}`;

function findStudentPosition(nextSeatsTable, studentName) {
  for (let row = 0; row < nextSeatsTable.length; row++) {
    for (let col = 0; col < nextSeatsTable[row].length; col++) {
      if (nextSeatsTable[row][col] === studentName) {
        return [col, row];
      }
    }
  }
  return null;
}

function maxDistance(p1, p2) {
  return Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]));
}

async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

async function runChangeSeats(page) {
  return await page.evaluate(() => {
    app.changeSeats();
    return {
      nextSeatsTable: app.nextSeatsTable,
      nextGenderTable: app.nextGenderTable,
      seatsTable: app.seatsTable,
    };
  });
}

test.describe('複数条件の組み合わせテスト', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('前に固定 + 近づける → 10回連続で両方成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.frontConditions = ['山田', '坂本'];
      app.nearConditions = [['山田', '坂本', 0]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable } = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(posA[1]).toBe(0);
      expect(posB[1]).toBe(0);
      expect(maxDistance(posA, posB)).toBeLessThanOrEqual(1);
    }
  });

  test('後ろに固定 + 離す → 10回連続で両方成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.backConditions = ['山田', '坂本'];
      app.farConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable } = await runChangeSeats(page);
      const lastRow = nextSeatsTable.length - 1;
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(posA[1]).toBe(lastRow);
      expect(posB[1]).toBe(lastRow);
      expect(maxDistance(posA, posB)).toBeGreaterThanOrEqual(2);
    }
  });

  test('前から2列目以内 + 後ろから2列目以内 + 近づける → 10回連続ですべて成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.frontTwoRowsConditions = ['山田'];
      app.backTwoRowsConditions = ['永瀬'];
      app.nearConditions = [['中川', '坂本', 0]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable } = await runChangeSeats(page);
      const lastRow = nextSeatsTable.length - 1;
      const posYamada = findStudentPosition(nextSeatsTable, '山田');
      expect(posYamada[1]).toBeLessThanOrEqual(1);
      const posNagase = findStudentPosition(nextSeatsTable, '永瀬');
      expect(posNagase[1]).toBeGreaterThanOrEqual(lastRow - 1);
      const posNakagawa = findStudentPosition(nextSeatsTable, '中川');
      const posSakamoto = findStudentPosition(nextSeatsTable, '坂本');
      expect(maxDistance(posNakagawa, posSakamoto)).toBeLessThanOrEqual(1);
    }
  });

  test('固定座席 + 近づける → 10回連続で両方成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.fixConditions = [['山田', 3, 3]];
      app.nearConditions = [['山田', '坂本', 0]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable } = await runChangeSeats(page);
      expect(nextSeatsTable[2][2]).toBe('山田');
      const posSakamoto = findStudentPosition(nextSeatsTable, '坂本');
      expect(maxDistance([2, 2], posSakamoto)).toBeLessThanOrEqual(1);
    }
  });

  test('固定座席 + 離す → 10回連続で両方成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.fixConditions = [['山田', 1, 1]];
      app.farConditions = [['山田', '坂本', 2]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable } = await runChangeSeats(page);
      expect(nextSeatsTable[0][0]).toBe('山田');
      const posSakamoto = findStudentPosition(nextSeatsTable, '坂本');
      expect(maxDistance([0, 0], posSakamoto)).toBeGreaterThanOrEqual(3);
    }
  });

  test('前に固定 + 離す → 10回連続で両方成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.frontConditions = ['山田', '坂本'];
      app.farConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable } = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(posA[1]).toBe(0);
      expect(posB[1]).toBe(0);
      expect(maxDistance(posA, posB)).toBeGreaterThanOrEqual(2);
    }
  });

  test('全員移動 + 近づける → 10回連続で両方成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.isAllDifferent = true;
      app.nearConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        const beforeTable = app.seatsTable.map(row => [...row]);
        app.changeSeats();
        const afterTable = app.nextSeatsTable;
        let allDifferent = true;
        for (let row = 0; row < beforeTable.length; row++) {
          for (let col = 0; col < beforeTable[row].length; col++) {
            const student = beforeTable[row][col];
            if (student && afterTable[row][col] === student) {
              allDifferent = false;
            }
          }
        }
        return { allDifferent, afterTable };
      });
      expect(result.allDifferent).toBe(true);
      const posA = findStudentPosition(result.afterTable, '山田');
      const posB = findStudentPosition(result.afterTable, '坂本');
      expect(maxDistance(posA, posB)).toBeLessThanOrEqual(2);
    }
  });

  test('全員移動 + 離す + 後ろに固定 → 10回連続ですべて成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.isAllDifferent = true;
      app.backConditions = ['山田'];
      app.farConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        const beforeTable = app.seatsTable.map(row => [...row]);
        app.changeSeats();
        const afterTable = app.nextSeatsTable;
        let allDifferent = true;
        for (let row = 0; row < beforeTable.length; row++) {
          for (let col = 0; col < beforeTable[row].length; col++) {
            const student = beforeTable[row][col];
            if (student && afterTable[row][col] === student) {
              allDifferent = false;
            }
          }
        }
        return { allDifferent, afterTable };
      });
      expect(result.allDifferent).toBe(true);
      const lastRow = result.afterTable.length - 1;
      const posYamada = findStudentPosition(result.afterTable, '山田');
      expect(posYamada[1]).toBe(lastRow);
      const posSakamoto = findStudentPosition(result.afterTable, '坂本');
      expect(maxDistance(posYamada, posSakamoto)).toBeGreaterThanOrEqual(2);
    }
  });

  test('性別固定 + 前に固定 → 10回連続で両方成立する（既知のバグ：性別パターンが崩れる）', async ({ page }) => {
    test.fail();
    const originalGenderTable = await page.evaluate(() => app.genderTable);

    await page.evaluate(() => {
      app.isFixGender = true;
      app.frontConditions = ['永瀬'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable, nextGenderTable } = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '永瀬');
      expect(pos[1]).toBe(0);
      for (let row = 0; row < originalGenderTable.length; row++) {
        for (let col = 0; col < originalGenderTable[row].length; col++) {
          expect(nextGenderTable[row][col]).toBe(originalGenderTable[row][col]);
        }
      }
    }
  });

  test('性別固定 + 近づける → 10回連続で両方成立する（既知のバグ：性別パターンが崩れる）', async ({ page }) => {
    test.fail();
    const originalGenderTable = await page.evaluate(() => app.genderTable);

    await page.evaluate(() => {
      app.isFixGender = true;
      app.nearConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable, nextGenderTable } = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(maxDistance(posA, posB)).toBeLessThanOrEqual(2);
      for (let row = 0; row < originalGenderTable.length; row++) {
        for (let col = 0; col < originalGenderTable[row].length; col++) {
          expect(nextGenderTable[row][col]).toBe(originalGenderTable[row][col]);
        }
      }
    }
  });

  test('性別固定 + 離す → 10回連続で両方成立する（既知のバグ：性別パターンが崩れる）', async ({ page }) => {
    test.fail();
    const originalGenderTable = await page.evaluate(() => app.genderTable);

    await page.evaluate(() => {
      app.isFixGender = true;
      app.farConditions = [['山田', '坂本', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const { nextSeatsTable, nextGenderTable } = await runChangeSeats(page);
      const posA = findStudentPosition(nextSeatsTable, '山田');
      const posB = findStudentPosition(nextSeatsTable, '坂本');
      expect(maxDistance(posA, posB)).toBeGreaterThanOrEqual(2);
      for (let row = 0; row < originalGenderTable.length; row++) {
        for (let col = 0; col < originalGenderTable[row].length; col++) {
          expect(nextGenderTable[row][col]).toBe(originalGenderTable[row][col]);
        }
      }
    }
  });

  test('全員移動 + 近づける + 離す + 前に固定 + 後ろに固定 → 10回連続ですべて成立する', async ({ page }) => {
    await page.evaluate(() => {
      app.isAllDifferent = true;
      app.frontConditions = ['山田'];
      app.backConditions = ['永瀬'];
      app.nearConditions = [['中川', '坂本', 1]];
      app.farConditions = [['山田', '永瀬', 1]];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        const beforeTable = app.seatsTable.map(row => [...row]);
        app.changeSeats();
        const afterTable = app.nextSeatsTable;
        let allDifferent = true;
        for (let row = 0; row < beforeTable.length; row++) {
          for (let col = 0; col < beforeTable[row].length; col++) {
            const student = beforeTable[row][col];
            if (student && afterTable[row][col] === student) {
              allDifferent = false;
            }
          }
        }
        return { allDifferent, afterTable };
      });
      // 全員移動
      expect(result.allDifferent).toBe(true);
      // 前に固定
      const posYamada = findStudentPosition(result.afterTable, '山田');
      expect(posYamada[1]).toBe(0);
      // 後ろに固定
      const lastRow = result.afterTable.length - 1;
      const posNagase = findStudentPosition(result.afterTable, '永瀬');
      expect(posNagase[1]).toBe(lastRow);
      // 近づける
      const posNakagawa = findStudentPosition(result.afterTable, '中川');
      const posSakamoto = findStudentPosition(result.afterTable, '坂本');
      expect(maxDistance(posNakagawa, posSakamoto)).toBeLessThanOrEqual(2);
      // 離す
      expect(maxDistance(posYamada, posNagase)).toBeGreaterThanOrEqual(2);
    }
  });
});
