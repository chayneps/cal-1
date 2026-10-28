// tests/e2e/appearance.test.js
const test = require('node:test');
const assert = require('node:assert');
const { TestBrowser } = require('../helpers/test-browser.js');

test('E2E Regression: Appearance, Today Header & Theme Settings', async (t) => {
  const browser = new TestBrowser({ port: 8893, debugPort: 9253 });
  await browser.start();

  t.after(() => {
    browser.close();
  });

  await t.test('Date tile number font size and styling', async () => {
    const res = await browser.eval(`
      (() => {
        const num = document.querySelector('.day-cell:not(.other-month) .day-number');
        if (!num) return null;
        const style = window.getComputedStyle(num);
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight
        };
      })()
    `);

    assert.ok(res, 'Day number element should exist');
    assert.strictEqual(res.fontSize, '15px', 'Day number font size should be 15px');
    assert.ok(parseInt(res.fontWeight, 10) >= 700, 'Day number should be bold');
  });

  await t.test('Today tile and corresponding weekday header synchronization', async () => {
    const res = await browser.eval(`
      (() => {
        const todayDateStr = window.app.formatDateKey(window.app.today);
        const todayCell = document.querySelector(\`.day-cell[data-date="\${todayDateStr}"]\`);
        window.app.startTodayBlinking(todayCell);

        const dayClasses = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu', 'day-fri', 'day-sat'];
        const todayDayClass = dayClasses[window.app.today.getDay()];
        const todayHeaderCol = document.querySelector(\`.weekday-col.\${todayDayClass}\`);

        return {
          hasTodayCell: !!todayCell,
          todayCellHasIsToday: todayCell?.classList.contains('is-today'),
          todayHeaderHasIsToday: todayHeaderCol?.classList.contains('is-today'),
          todayHeaderHasBlinking: todayHeaderCol?.classList.contains('today-blinking')
        };
      })()
    `);

    assert.strictEqual(res.hasTodayCell, true, 'Today cell should exist');
    assert.strictEqual(res.todayCellHasIsToday, true, 'Today cell should have is-today class');
    assert.strictEqual(res.todayHeaderHasIsToday, true, 'Today weekday header column should have is-today class');
    assert.strictEqual(res.todayHeaderHasBlinking, true, 'Today weekday header column should have today-blinking class');
  });

  await t.test('Today tile holiday star has high contrast black color', async () => {
    const res = await browser.eval(`
      (async () => {
        // Temporarily assign today as a holiday to verify star contrast
        const todayKey = window.app.formatDateKey(window.app.today);
        window.app.holidaysMap[todayKey] = {
          date: todayKey,
          name: 'Test Today Holiday',
          localName: 'Test Today Holiday'
        };
        window.app.renderMonthGrid();

        const todayCell = document.querySelector(\`.day-cell[data-date="\${todayKey}"]\`);
        window.app.startTodayBlinking(todayCell);

        const star = todayCell?.querySelector('.holiday-star');
        const starColor = star ? window.getComputedStyle(star).color : null;

        return {
          hasStar: !!star,
          starColor
        };
      })()
    `);

    assert.strictEqual(res.hasStar, true, 'Holiday star should be present on today cell');
    assert.strictEqual(res.starColor, 'rgb(0, 0, 0)', 'Holiday star on today cell must be solid black for phosphor contrast');
  });

  await t.test('CRT Effects toggle and overlay are removed', async () => {
    const res = await browser.eval(`
      (async () => {
        const crtOverlay = document.getElementById('crtOverlay');
        const crtEffectToggle = document.getElementById('crtEffectToggle');
        const hasCrtActive = document.body.classList.contains('crt-active');

        return {
          hasOverlay: Boolean(crtOverlay),
          hasToggle: Boolean(crtEffectToggle),
          hasCrtActive
        };
      })()
    `);

    assert.strictEqual(res.hasOverlay, false, 'crtOverlay element should not exist');
    assert.strictEqual(res.hasToggle, false, 'crtEffectToggle should not exist');
    assert.strictEqual(res.hasCrtActive, false, 'body should not have crt-active class');
  });

  await t.test('Theme switcher applies theme class to document body', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.setTheme('obsidian');
        const isObsidian = document.body.classList.contains('theme-obsidian');

        window.app.setTheme('homebrew');
        const isHomebrew = document.body.classList.contains('theme-homebrew');

        return { isObsidian, isHomebrew };
      })()
    `);

    assert.strictEqual(res.isObsidian, true, 'obsidian theme class applied');
    assert.strictEqual(res.isHomebrew, true, 'homebrew theme class applied');
  });
});
