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

  await t.test('4-Month view is enabled by default and zoom button toggles views', async () => {
    const res = await browser.eval(`
      (async () => {
        // Reset to October 2026
        window.app.viewYear = 2026;
        window.app.viewMonth = 9; // October

        const zoomBtn = document.getElementById('zoomViewBtn');
        const quadContainer = document.getElementById('quadMonthContainer');

        // Check default state (should be 4-month view by default)
        const isQuadDefault = document.body.classList.contains('view-quad');
        const btnActiveDefault = zoomBtn.classList.contains('active');
        const quadVisibleDefault = quadContainer && !quadContainer.classList.contains('hidden');
        const cardsCountDefault = document.querySelectorAll('.mini-month-card').length;

        // Toggle to 1-month view
        zoomBtn.click();
        await new Promise(r => setTimeout(r, 150));
        const isSingleAfterClick = !document.body.classList.contains('view-quad');

        // Toggle back to 4-month view
        zoomBtn.click();
        await new Promise(r => setTimeout(r, 150));
        const isQuadAgain = document.body.classList.contains('view-quad');

        return {
          isQuadDefault,
          btnActiveDefault,
          quadVisibleDefault,
          cardsCountDefault,
          isSingleAfterClick,
          isQuadAgain
        };
      })()
    `);

    assert.strictEqual(res.isQuadDefault, true, 'body should have view-quad class by default');
    assert.strictEqual(res.btnActiveDefault, true, 'zoom button should be active by default');
    assert.strictEqual(res.quadVisibleDefault, true, 'quad container should be visible by default');
    assert.strictEqual(res.cardsCountDefault, 4, 'Should render 4 mini-month cards by default');
    assert.strictEqual(res.isSingleAfterClick, true, 'Clicking zoom button should toggle to 1-month view');
    assert.strictEqual(res.isQuadAgain, true, 'Clicking zoom button again should return to 4-month view');
  });

  await t.test('2x2 grid ordering: clean Month Year title, no redundant cal command or active badge, current month highlighted with border', async () => {
    const res = await browser.eval(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        return cards.map((card, idx) => {
          const title = card.querySelector('.mini-month-title')?.textContent.trim();
          const hasCmd = !!card.querySelector('.mini-cmd-prompt');
          const hasBadge = !!card.querySelector('.mini-cmd-badge');
          const isCurrent = card.classList.contains('is-current-month');
          return { idx, title, hasCmd, hasBadge, isCurrent };
        });
      })()
    `);

    assert.strictEqual(res.length, 4);

    // Card 0: Top-Left -> Month -1 (September 2026)
    assert.strictEqual(res[0].title, 'September 2026');
    assert.strictEqual(res[0].isCurrent, false);
    assert.strictEqual(res[0].hasCmd, false, 'Card should not contain redundant cal command line');
    assert.strictEqual(res[0].hasBadge, false, 'Card should not contain text badge');

    // Card 1: Top-Right -> Current Month (October 2026) -> Green border highlight only!
    assert.strictEqual(res[1].title, 'October 2026');
    assert.strictEqual(res[1].isCurrent, true, 'Card 1 (Top-Right) must have is-current-month green border highlight');
    assert.strictEqual(res[1].hasCmd, false, 'Card 1 must not have cal command line');
    assert.strictEqual(res[1].hasBadge, false, 'Card 1 must not have ACTIVE text badge (identified by green border)');

    // Card 2: Bottom-Left -> Month +1 (November 2026)
    assert.strictEqual(res[2].title, 'November 2026');
    assert.strictEqual(res[2].isCurrent, false);
    assert.strictEqual(res[2].hasCmd, false);
    assert.strictEqual(res[2].hasBadge, false);

    // Card 3: Bottom-Right -> Month +2 (December 2026)
    assert.strictEqual(res[3].title, 'December 2026');
    assert.strictEqual(res[3].isCurrent, false);
    assert.strictEqual(res[3].hasCmd, false);
    assert.strictEqual(res[3].hasBadge, false);
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

  await t.test('4-Month entrance animation: all 4 months appear together and each scans from top-left to bottom-right', async () => {
    const res = await browser.eval(`
      (async () => {
        // Trigger quad view entrance animation
        window.app.setQuadView(true);

        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        const cardDelays = cards.map(c => c.style.animationDelay);

        const cardDetails = cards.map(card => {
          const cells = Array.from(card.querySelectorAll('.mini-day-cell'));
          const firstDelay = parseInt(cells[0]?.style.animationDelay || '0', 10);
          const lastDelay = parseInt(cells[cells.length - 1]?.style.animationDelay || '0', 10);
          const isMonotonic = cells.every((c, i) => {
            if (i === 0) return true;
            const prev = parseInt(cells[i - 1]?.style.animationDelay || '0', 10);
            const curr = parseInt(c?.style.animationDelay || '0', 10);
            return curr >= prev;
          });
          return {
            cellCount: cells.length,
            firstDelay,
            lastDelay,
            isMonotonic
          };
        });

        return {
          cardDelays,
          cardDetails
        };
      })()
    `);

    // Verify all 4 cards appear together at 0ms
    assert.deepStrictEqual(res.cardDelays, ['0ms', '0ms', '0ms', '0ms'], 'All 4 cards must appear together at 0ms');

    // For every card, day cells must sweep from top-left to bottom-right corner
    for (let i = 0; i < 4; i++) {
      const details = res.cardDetails[i];
      assert.strictEqual(details.firstDelay, 60, `Card ${i} first cell (top-left) should start at 60ms`);
      assert.strictEqual(details.lastDelay, 1060, `Card ${i} last cell (bottom-right) should finish at 1060ms`);
      assert.strictEqual(details.isMonotonic, true, `Card ${i} cells should strictly increase from top-left to bottom-right`);
    }
  });
});
