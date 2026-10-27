// tests/e2e/quad-view.test.js
const test = require('node:test');
const assert = require('node:assert');
const { TestBrowser } = require('../helpers/test-browser.js');

test('E2E Regression: 4-Month 2x2 Zoom View', async (t) => {
  const browser = new TestBrowser({ port: 8894, debugPort: 9254 });
  await browser.start();

  t.after(() => {
    browser.close();
  });

  await t.test('Zoom button is placed in header before + button', async () => {
    const res = await browser.eval(`
      (() => {
        const zoomBtn = document.getElementById('zoomViewBtn');
        const newEventBtn = document.getElementById('newEventBtn');
        const headerActions = document.querySelector('.header-actions');
        const isBefore = zoomBtn && newEventBtn && zoomBtn.nextElementSibling === newEventBtn;
        return {
          exists: !!zoomBtn,
          inHeaderActions: !!headerActions?.contains(zoomBtn),
          isBeforePlus: isBefore
        };
      })()
    `);

    assert.strictEqual(res.exists, true, 'zoomViewBtn should exist');
    assert.strictEqual(res.inHeaderActions, true, 'zoomViewBtn should be in .header-actions');
    assert.strictEqual(res.isBeforePlus, true, 'zoomViewBtn should be placed before newEventBtn (+)');
  });

  await t.test('Clicking zoom button toggles 2x2 4-month view', async () => {
    const res = await browser.eval(`
      (async () => {
        // Reset to October 2026
        window.app.viewYear = 2026;
        window.app.viewMonth = 9; // October

        const zoomBtn = document.getElementById('zoomViewBtn');
        zoomBtn.click();
        await new Promise(r => setTimeout(r, 200));

        const isQuad = document.body.classList.contains('view-quad');
        const btnActive = zoomBtn.classList.contains('active');
        const quadContainer = document.getElementById('quadMonthContainer');
        const quadVisible = quadContainer && !quadContainer.classList.contains('hidden');
        const cards = Array.from(document.querySelectorAll('.mini-month-card'));

        return {
          isQuad,
          btnActive,
          quadVisible,
          cardsCount: cards.length
        };
      })()
    `);

    assert.strictEqual(res.isQuad, true, 'body should have view-quad class');
    assert.strictEqual(res.btnActive, true, 'zoom button should be active');
    assert.strictEqual(res.quadVisible, true, 'quad container should be visible');
    assert.strictEqual(res.cardsCount, 4, 'Should render exactly 4 mini-month cards');
  });

  await t.test('2x2 grid ordering: current month is Top-Right corner and highlighted', async () => {
    const res = await browser.eval(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        return cards.map((card, idx) => {
          const promptCmd = card.querySelector('.mini-prompt-cmd')?.textContent.trim();
          const badge = card.querySelector('.mini-cmd-badge')?.textContent.trim();
          const isCurrent = card.classList.contains('is-current-month');
          return { idx, promptCmd, badge, isCurrent };
        });
      })()
    `);

    assert.strictEqual(res.length, 4);

    // Card 0: Top-Left -> Month -1 (Sep 2026)
    assert.strictEqual(res[0].promptCmd, 'cal Sep 2026');
    assert.strictEqual(res[0].isCurrent, false);

    // Card 1: Top-Right -> Current Month (Oct 2026) -> Highlighted!
    assert.strictEqual(res[1].promptCmd, 'cal Oct 2026');
    assert.strictEqual(res[1].isCurrent, true, 'Card 1 (Top-Right) must have is-current-month highlight');
    assert.strictEqual(res[1].badge, 'ACTIVE');

    // Card 2: Bottom-Left -> Month +1 (Nov 2026)
    assert.strictEqual(res[2].promptCmd, 'cal Nov 2026');
    assert.strictEqual(res[2].isCurrent, false);

    // Card 3: Bottom-Right -> Month +2 (Dec 2026)
    assert.strictEqual(res[3].promptCmd, 'cal Dec 2026');
    assert.strictEqual(res[3].isCurrent, false);
  });

  await t.test('Hover popover appears when hovering day cell in quad view', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.setQuadView(true);
        const cell = document.querySelector('.mini-day-cell:not(.other-month)');
        window.app.showDaySchedulePopover(cell, new Date(2026, 9, 15));
        const popover = document.getElementById('dayDetailPopover');
        const heading = document.getElementById('popoverDateHeading')?.textContent;
        const isVisible = popover && !popover.classList.contains('hidden');
        const cellHasActive = cell?.classList.contains('popover-active');

        // Test hide
        window.app.hidePopover();
        const isHiddenAfter = popover?.classList.contains('hidden');
        const cellClearedActive = !cell?.classList.contains('popover-active');

        return {
          isVisible,
          cellHasActive,
          heading,
          isHiddenAfter,
          cellClearedActive
        };
      })()
    `);

    assert.strictEqual(res.isVisible, true, 'Popover should be visible when hovering day cell in quad view');
    assert.strictEqual(res.cellHasActive, true, 'Hovered mini day cell should receive popover-active class');
    assert.ok(res.heading.includes('Oct 15'), 'Popover heading should show correct date');
    assert.strictEqual(res.isHiddenAfter, true, 'Popover should hide cleanly');
    assert.strictEqual(res.cellClearedActive, true, 'popover-active class should be removed on hide');
  });

  await t.test('Clicking a mini month zooms in to that month in single view', async () => {
    const res = await browser.eval(`
      (async () => {
        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        // Click Card 2 (Nov 2026)
        cards[2].click();
        await new Promise(r => setTimeout(r, 200));

        return {
          isQuad: document.body.classList.contains('view-quad'),
          viewMonth: window.app.viewMonth,
          viewYear: window.app.viewYear,
          commandValue: window.app.calCommandLine.value
        };
      })()
    `);

    assert.strictEqual(res.isQuad, false, 'Should zoom back into 1-month view');
    assert.strictEqual(res.viewMonth, 10, 'View month should become November (10)');
    assert.ok(res.commandValue.includes('November'), 'Command prompt should show November');
  });

  await t.test('CLI commands cal 4 and cal 1 toggle views', async () => {
    const res4 = await browser.eval(`
      (async () => {
        window.app.calCommandLine.value = 'cal 4';
        await window.app.handleCalCommandSubmit();
        return document.body.classList.contains('view-quad');
      })()
    `);
    assert.strictEqual(res4, true, 'cal 4 should enable quad view');

    const res1 = await browser.eval(`
      (async () => {
        window.app.calCommandLine.value = 'cal 1';
        await window.app.handleCalCommandSubmit();
        return document.body.classList.contains('view-quad');
      })()
    `);
    assert.strictEqual(res1, false, 'cal 1 should return to single view');
  });

  await t.test('Mini calendar cards match regular calendar styling with Thai daily colors and badges', async () => {
    const res = await browser.eval(`
      (async () => {
        // Switch to quad view
        window.app.setQuadView(true);
        await new Promise(r => setTimeout(r, 100));

        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        const firstCard = cards[0];
        const weekdayCols = Array.from(firstCard.querySelectorAll('.mini-weekday-col'));
        const dayCells = Array.from(firstCard.querySelectorAll('.mini-day-cell'));

        const weekdayTexts = weekdayCols.map(c => c.textContent.trim());
        const weekdayClasses = weekdayCols.map(c => Array.from(c.classList));

        const thaiDayClasses = ['day-sun', 'day-mon', 'day-tue', 'day-wed', 'day-thu', 'day-fri', 'day-sat'];
        const dayCellClasses = dayCells.slice(0, 7).map(c => Array.from(c.classList));

        // Check cell top structure and event pills
        const sampleCell = firstCard.querySelector('.mini-day-cell:not(.other-month)');
        const hasCellTop = !!sampleCell?.querySelector('.mini-cell-top');
        const hasDayNumber = !!sampleCell?.querySelector('.mini-day-number');

        return {
          weekdayTexts,
          weekdayClasses,
          dayCellClasses,
          thaiDayClasses,
          hasCellTop,
          hasDayNumber
        };
      })()
    `);

    // Check weekday badges are 3-letter (SUN, MON, ...)
    assert.deepStrictEqual(res.weekdayTexts, ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], 'Mini weekday headers must use 3-letter badges');

    // Check weekday columns have Thai day color classes
    for (let i = 0; i < 7; i++) {
      assert.ok(res.weekdayClasses[i].includes(res.thaiDayClasses[i]), `Weekday col ${i} must have class ${res.thaiDayClasses[i]}`);
    }

    // Check day cells have Thai daily color classes
    for (let i = 0; i < 7; i++) {
      assert.ok(res.dayCellClasses[i].includes(res.thaiDayClasses[i]), `Day cell ${i} must have class ${res.thaiDayClasses[i]}`);
    }

    assert.strictEqual(res.hasCellTop, true, 'Mini day cell should contain .mini-cell-top');
    assert.strictEqual(res.hasDayNumber, true, 'Mini day cell should contain .mini-day-number');
  });

  await t.test('Zoom transition animation classes are triggered on zoom out and zoom in', async () => {
    const res = await browser.eval(`
      (async () => {
        // Toggle to single view first
        window.app.setQuadView(false);
        const singleViewportHasZoomIn = document.querySelector('.calendar-viewport')?.classList.contains('anim-zoom-in');

        // Toggle to quad view (zoom out)
        window.app.setQuadView(true);
        const quadContainerHasZoomOut = document.getElementById('quadMonthContainer')?.classList.contains('anim-zoom-out');

        // Toggle back to single view (zoom in)
        window.app.setQuadView(false);
        const singleViewportZoomedInAgain = document.querySelector('.calendar-viewport')?.classList.contains('anim-zoom-in');

        return {
          singleViewportHasZoomIn,
          quadContainerHasZoomOut,
          singleViewportZoomedInAgain
        };
      })()
    `);

    assert.strictEqual(res.quadContainerHasZoomOut, true, 'quadMonthContainer should receive anim-zoom-out on zoom out');
    assert.strictEqual(res.singleViewportZoomedInAgain, true, 'calendar-viewport should receive anim-zoom-in on zoom in');
  });
});
