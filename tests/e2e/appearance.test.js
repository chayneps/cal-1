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

  await t.test('CRT Effects toggle controls crt-active class and overlay', async () => {
    const res = await browser.eval(`
      (async () => {
        // Turn CRT off
        window.app.setCrtEffects(false);
        const offActive = document.body.classList.contains('crt-active');
        const offOverlayHidden = document.getElementById('crtOverlay').classList.contains('hidden');

        // Turn CRT on
        window.app.setCrtEffects(true);
        const onActive = document.body.classList.contains('crt-active');
        const onOverlayHidden = document.getElementById('crtOverlay').classList.contains('hidden');

        return {
          offActive,
          offOverlayHidden,
          onActive,
          onOverlayHidden
        };
      })()
    `);

    assert.strictEqual(res.offActive, false, 'body should not have crt-active when disabled');
    assert.strictEqual(res.offOverlayHidden, true, 'overlay should be hidden when disabled');
    assert.strictEqual(res.onActive, true, 'body should have crt-active when enabled');
    assert.strictEqual(res.onOverlayHidden, false, 'overlay should be visible when enabled');
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
