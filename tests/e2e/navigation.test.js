// tests/e2e/navigation.test.js
const test = require('node:test');
const assert = require('node:assert');
const { TestBrowser } = require('../helpers/test-browser.js');

test('E2E Regression: Navigation & Animation Direction', async (t) => {
  const browser = new TestBrowser({ port: 8892, debugPort: 9252 });
  await browser.start();

  t.after(() => {
    browser.close();
  });

  await t.test('Month navigation dismisses active popover and suppresses hover', async () => {
    const res = await browser.eval(`
      (async () => {
        // 1. Open popover on a cell
        const cell = document.querySelector('.day-cell:not(.other-month)');
        window.app.showDaySchedulePopover(cell, new Date(2026, 9, 15));
        const wasOpen = !document.getElementById('dayDetailPopover').classList.contains('hidden');

        // 2. Navigate month forward
        await window.app.navigateMonth(1);

        const isOpenAfterNav = !document.getElementById('dayDetailPopover').classList.contains('hidden');
        const isHoverSuppressed = window.app.isHoverSuppressed;
        const bodyHasKeyboardNav = document.body.classList.contains('keyboard-nav');

        return {
          wasOpen,
          isOpenAfterNav,
          isHoverSuppressed,
          bodyHasKeyboardNav
        };
      })()
    `);

    assert.strictEqual(res.wasOpen, true, 'Popover was initially open');
    assert.strictEqual(res.isOpenAfterNav, false, 'Popover should be hidden after month navigation');
    assert.strictEqual(res.isHoverSuppressed, true, 'Hover should be suppressed after navigation');
    assert.strictEqual(res.bodyHasKeyboardNav, true, 'body should have keyboard-nav class');
  });

  await t.test('Reverse animation applied on backward month navigation', async () => {
    const res = await browser.eval(`
      (async () => {
        // Navigate backward with -1 (Left or Up arrow)
        await window.app.navigateMonth(-1);

        const cells = Array.from(document.querySelectorAll('.day-cell'));
        const hasReverseAnim = cells.some(c => c.classList.contains('tile-appear-reverse'));
        const navDirection = window.app.navDirection;

        return {
          navDirection,
          hasReverseAnim
        };
      })()
    `);

    assert.strictEqual(res.navDirection, 'backward', 'navDirection should be backward');
    assert.strictEqual(res.hasReverseAnim, true, 'Cells should have tile-appear-reverse animation class');
  });

  await t.test('Forward animation applied on forward month navigation', async () => {
    const res = await browser.eval(`
      (async () => {
        // Navigate forward with +1 (Right or Down arrow)
        await window.app.navigateMonth(1);

        const cells = Array.from(document.querySelectorAll('.day-cell'));
        const hasForwardAnim = cells.some(c => c.classList.contains('tile-appear'));
        const navDirection = window.app.navDirection;

        return {
          navDirection,
          hasForwardAnim
        };
      })()
    `);

    assert.strictEqual(res.navDirection, 'forward', 'navDirection should be forward');
    assert.strictEqual(res.hasForwardAnim, true, 'Cells should have tile-appear animation class');
  });

  await t.test('CLI cal navigation jumps to specified month and year', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.calCommandLine.value = 'cal 12 2027';
        await window.app.handleCalCommandSubmit();

        return {
          viewMonth: window.app.viewMonth,
          viewYear: window.app.viewYear,
          commandValue: window.app.calCommandLine ? window.app.calCommandLine.value : ''
        };
      })()
    `);

    assert.strictEqual(res.viewMonth, 11, 'Month should be December (0-indexed 11)');
    assert.strictEqual(res.viewYear, 2027, 'Year should be 2027');
    assert.ok(res.commandValue.includes('2027'), 'Command line should display 2027');
  });

  await t.test('CLI cal today jumps back to current month', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.calCommandLine.value = 'cal today';
        await window.app.handleCalCommandSubmit();

        const today = new Date();
        return {
          viewMonth: window.app.viewMonth,
          viewYear: window.app.viewYear,
          expectedMonth: today.getMonth(),
          expectedYear: today.getFullYear()
        };
      })()
    `);

    assert.strictEqual(res.viewMonth, res.expectedMonth);
    assert.strictEqual(res.viewYear, res.expectedYear);
  });
});
