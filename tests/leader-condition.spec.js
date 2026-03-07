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

function getGroupId(col, row, groupSizeX, groupSizeY, seatsSizeX) {
  let numGroupCols = seatsSizeX / groupSizeX;
  let groupCol = Math.floor(col / groupSizeX);
  let groupRow = Math.floor(row / groupSizeY);
  return groupRow * numGroupCols + groupCol;
}

async function setupDemoData(page) {
  await page.evaluate(() => { app.setDemoData(); });
  await page.waitForTimeout(100);
}

async function runChangeSeats(page) {
  return await page.evaluate(() => {
    app.changeSeats();
    return app.nextSeatsTable;
  });
}

test.describe('班長を指定する（leaderConditions）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('班長を1人指定 → 10回連続でいずれかの班に配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.leaderConditions = ['山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '山田');
      expect(pos).not.toBeNull();
    }
  });

  test('班長を班数分（6人）指定 → 10回連続で各班に1人ずつ配置される', async ({ page }) => {
    // デモデータ: 6x6, groupSizeX=2, groupSizeY=3 → 6班
    const leaders = ['山田', '坂本', '中川', '岡村', '永瀬', '濱井'];
    await page.evaluate((leaders) => {
      app.leaderConditions = leaders;
    }, leaders);
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const leaderGroups = new Set();
      for (const name of leaders) {
        const pos = findStudentPosition(nextSeatsTable, name);
        expect(pos).not.toBeNull();
        const groupId = getGroupId(pos[0], pos[1], 2, 3, 6);
        leaderGroups.add(groupId);
      }
      // 6人の班長がそれぞれ異なる班に配置される
      expect(leaderGroups.size).toBe(6);
    }
  });

  test('班長を2人指定 → 10回連続でそれぞれ異なる班に配置される', async ({ page }) => {
    const leaders = ['山田', '坂本'];
    await page.evaluate((leaders) => {
      app.leaderConditions = leaders;
    }, leaders);
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos1 = findStudentPosition(nextSeatsTable, '山田');
      const pos2 = findStudentPosition(nextSeatsTable, '坂本');
      expect(pos1).not.toBeNull();
      expect(pos2).not.toBeNull();
      const group1 = getGroupId(pos1[0], pos1[1], 2, 3, 6);
      const group2 = getGroupId(pos2[0], pos2[1], 2, 3, 6);
      expect(group1).not.toBe(group2);
    }
  });

  test('班長 + 固定座席 → 固定が優先され、残りの班長は他の班に配置される', async ({ page }) => {
    await page.evaluate(() => {
      // 中川を (col=1, row=1) = 0-indexed [0][0] に固定 → Group 0
      app.fixConditions = [['中川', 1, 1]];
      // 中川と山田を班長に指定
      app.leaderConditions = ['中川', '山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      // 中川は固定座席に配置される
      expect(nextSeatsTable[0][0]).toBe('中川');
      const posNakagawa = [0, 0];
      const posYamada = findStudentPosition(nextSeatsTable, '山田');
      expect(posYamada).not.toBeNull();
      const groupNakagawa = getGroupId(posNakagawa[0], posNakagawa[1], 2, 3, 6);
      const groupYamada = getGroupId(posYamada[0], posYamada[1], 2, 3, 6);
      // 中川と山田は異なる班に配置される
      expect(groupNakagawa).not.toBe(groupYamada);
    }
  });

  test('班長未指定 → 既存動作と同一（エラーなし）', async ({ page }) => {
    await page.evaluate(() => {
      app.leaderConditions = [''];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      // 席替えが正常に完了する（全員が配置される）
      let studentCount = 0;
      for (const row of nextSeatsTable) {
        for (const cell of row) {
          if (cell) studentCount++;
        }
      }
      expect(studentCount).toBe(36);
    }
  });

  test('班長 + 最前列を同じ生徒に指定 → 10回連続で最前列に配置され全員配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.frontConditions = ['山田'];
      app.leaderConditions = ['山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '山田');
      expect(pos).not.toBeNull();
      expect(pos[1]).toBe(0); // 最前列に配置される
      let studentCount = 0;
      for (const row of nextSeatsTable) {
        for (const cell of row) {
          if (cell) studentCount++;
        }
      }
      expect(studentCount).toBe(36);
    }
  });

  test('班長 + 最後列を同じ生徒に指定 → 10回連続で最後列に配置され全員配置される', async ({ page }) => {
    await page.evaluate(() => {
      app.backConditions = ['高橋'];
      app.leaderConditions = ['高橋'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const pos = findStudentPosition(nextSeatsTable, '高橋');
      expect(pos).not.toBeNull();
      expect(pos[1]).toBe(5); // 最後列に配置される
      let studentCount = 0;
      for (const row of nextSeatsTable) {
        for (const cell of row) {
          if (cell) studentCount++;
        }
      }
      expect(studentCount).toBe(36);
    }
  });

  test('複数人を班長 + 最前列に指定 → 10回連続で全員が最前列かつ異なる班に配置される', async ({ page }) => {
    const leaders = ['山田', '山口', '別本'];
    await page.evaluate((leaders) => {
      app.frontConditions = leaders;
      app.leaderConditions = leaders;
    }, leaders);
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      const leaderGroups = new Set();
      for (const name of leaders) {
        const pos = findStudentPosition(nextSeatsTable, name);
        expect(pos).not.toBeNull();
        expect(pos[1]).toBe(0); // 最前列に配置される
        const groupId = getGroupId(pos[0], pos[1], 2, 3, 6);
        leaderGroups.add(groupId);
      }
      expect(leaderGroups.size).toBe(3); // 全員異なる班
    }
  });

  test('班サイズが「なし」の場合 → 班長配置はスキップされ、エラーなく席替えが完了する', async ({ page }) => {
    await page.evaluate(() => {
      app.groupSizeX = 'なし';
      app.leaderConditions = ['山田'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const nextSeatsTable = await runChangeSeats(page);
      // 席替えが正常に完了する
      let studentCount = 0;
      for (const row of nextSeatsTable) {
        for (const cell of row) {
          if (cell) studentCount++;
        }
      }
      expect(studentCount).toBe(36);
    }
  });
});
