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

test.describe('全10条件の組み合わせテスト', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INDEX_HTML, { waitUntil: 'networkidle' });
    await setupDemoData(page);
  });

  test('全10条件を同時に設定 → 10回連続ですべて成立する', async ({ page }) => {
    const originalGenderTable = await page.evaluate(() => app.genderTable);

    await page.evaluate(() => {
      // 1. 最前列に固定
      app.frontConditions = ['山田'];
      // 2. 前から2列目以内に固定
      app.frontTwoRowsConditions = ['浦山'];
      // 3. 最後列に固定
      app.backConditions = ['高橋'];
      // 4. 後ろから2列目以内に固定
      app.backTwoRowsConditions = ['黒田'];
      // 5. 特定の座席に固定 (col=4, row=4 → 0-indexed: [3][3])
      app.fixConditions = [['中川', 4, 4]];
      // 6. 近づける
      app.nearConditions = [['坂本', '安岡', 1]];
      // 7. 離す
      app.farConditions = [['永瀬', '寺井', 1]];
      // 8. 全員移動
      app.isAllDifferent = true;
      // 9. 性別の並びを固定
      app.isFixGender = true;
      // 10. 班長を指定（デモデータ: groupSizeX=2, groupSizeY=3 → 6班）
      app.leaderConditions = ['別本', '平野'];
    });
    await page.waitForTimeout(50);

    for (let i = 0; i < 10; i++) {
      const result = await page.evaluate(() => {
        const beforeTable = app.seatsTable.map(row => [...row]);
        // 生徒名→性別のマップを作成（nextGenderTableは条件配置分が未記録のため使わない）
        const studentGenderMap = {};
        for (let row = 0; row < app.seatsTable.length; row++) {
          for (let col = 0; col < app.seatsTable[row].length; col++) {
            const name = app.seatsTable[row][col];
            if (name) {
              studentGenderMap[name] = app.genderTable[row][col];
            }
          }
        }
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
        return { allDifferent, afterTable, studentGenderMap };
      });

      // 8. 全員移動
      expect(result.allDifferent).toBe(true);

      // 1. 最前列に固定: 山田 → row 0
      const posYamada = findStudentPosition(result.afterTable, '山田');
      expect(posYamada[1]).toBe(0);

      // 2. 前から2列目以内に固定: 浦山 → row 0 or 1
      const posUrayama = findStudentPosition(result.afterTable, '浦山');
      expect(posUrayama[1]).toBeLessThanOrEqual(1);

      // 3. 最後列に固定: 高橋 → last row
      const lastRow = result.afterTable.length - 1;
      const posTakahashi = findStudentPosition(result.afterTable, '高橋');
      expect(posTakahashi[1]).toBe(lastRow);

      // 4. 後ろから2列目以内に固定: 黒田 → last row or last row - 1
      const posKuroda = findStudentPosition(result.afterTable, '黒田');
      expect(posKuroda[1]).toBeGreaterThanOrEqual(lastRow - 1);

      // 5. 特定の座席に固定: 中川 → [3][3] (0-indexed)
      expect(result.afterTable[3][3]).toBe('中川');

      // 6. 近づける: 坂本と安岡 → distance ≤ 2
      const posSakamoto = findStudentPosition(result.afterTable, '坂本');
      const posYasuoka = findStudentPosition(result.afterTable, '安岡');
      expect(maxDistance(posSakamoto, posYasuoka)).toBeLessThanOrEqual(2);

      // 7. 離す: 永瀬と寺井 → distance ≥ 2
      const posNagase = findStudentPosition(result.afterTable, '永瀬');
      const posTerai = findStudentPosition(result.afterTable, '寺井');
      expect(maxDistance(posNagase, posTerai)).toBeGreaterThanOrEqual(2);

      // 9. 性別の並びを固定: 各席の生徒の性別が元の性別パターンと一致する
      for (let row = 0; row < originalGenderTable.length; row++) {
        for (let col = 0; col < originalGenderTable[row].length; col++) {
          const studentName = result.afterTable[row][col];
          if (studentName) {
            const actualGender = result.studentGenderMap[studentName];
            expect(actualGender).toBe(originalGenderTable[row][col]);
          }
        }
      }

      // 10. 班長: 別本と平野がそれぞれ異なる班に配置される
      const posBetsumoto = findStudentPosition(result.afterTable, '別本');
      const posHirano = findStudentPosition(result.afterTable, '平野');
      expect(posBetsumoto).not.toBeNull();
      expect(posHirano).not.toBeNull();
      const groupBetsumoto = getGroupId(posBetsumoto[0], posBetsumoto[1], 2, 3, 6);
      const groupHirano = getGroupId(posHirano[0], posHirano[1], 2, 3, 6);
      expect(groupBetsumoto).not.toBe(groupHirano);
    }
  });
});
