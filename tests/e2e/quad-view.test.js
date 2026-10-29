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

  await t.test('4-Month view is default; zoom button only pushes into 4-month view (not toggle); 1-month view entered by selecting month', async () => {
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

        // Clicking zoom button while ALREADY in 4-month view must NOT toggle to 1-month view
        zoomBtn.click();
        await new Promise(r => setTimeout(r, 100));
        const isQuadStill = document.body.classList.contains('view-quad');

        // It can ONLY change to 1-month view by selecting a month
        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        cards[1].click(); // Select October 2026
        await new Promise(r => setTimeout(r, 150));
        const isSingleAfterSelectMonth = !document.body.classList.contains('view-quad');
        const btnActiveInSingle = zoomBtn.classList.contains('active');

        // When in 1-month view, pushing zoom button switches back to 4-month view
        zoomBtn.click();
        await new Promise(r => setTimeout(r, 150));
        const isQuadAfterPush = document.body.classList.contains('view-quad');

        return {
          isQuadDefault,
          btnActiveDefault,
          quadVisibleDefault,
          cardsCountDefault,
          isQuadStill,
          isSingleAfterSelectMonth,
          btnActiveInSingle,
          isQuadAfterPush
        };
      })()
    `);

    assert.strictEqual(res.isQuadDefault, true, 'body should have view-quad class by default');
    assert.strictEqual(res.btnActiveDefault, true, 'zoom button should be active by default');
    assert.strictEqual(res.quadVisibleDefault, true, 'quad container should be visible by default');
    assert.strictEqual(res.cardsCountDefault, 4, 'Should render 4 mini-month cards by default');
    assert.strictEqual(res.isQuadStill, true, 'Zoom button must NOT toggle when already in 4-month view');
    assert.strictEqual(res.isSingleAfterSelectMonth, true, 'Selecting a month must change to 1-month view');
    assert.strictEqual(res.btnActiveInSingle, false, 'Zoom button should not be active in 1-month view');
    assert.strictEqual(res.isQuadAfterPush, true, 'Clicking zoom button from 1-month view pushes into 4-month view');
  });

  await t.test('2x2 grid ordering: clean Month Year title, active month border removed, cards are uniform', async () => {
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

    // Card 1: Top-Right -> Month (October 2026) -> Active month border removed!
    assert.strictEqual(res[1].title, 'October 2026');
    assert.strictEqual(res[1].isCurrent, false, 'Card 1 must not have special is-current-month border (removed)');
    assert.strictEqual(res[1].hasCmd, false, 'Card 1 must not have cal command line');
    assert.strictEqual(res[1].hasBadge, false, 'Card 1 must not have ACTIVE text badge');

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

  await t.test('Hover popover in quad view takes full opposite half with height equal to main height', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.setQuadView(true);
        await new Promise(r => setTimeout(r, 200));

        const cards = Array.from(document.querySelectorAll('.mini-month-card'));
        const main = document.querySelector('.calendar-viewport');
        const quad = document.getElementById('quadMonthContainer');
        const popover = document.getElementById('dayDetailPopover');

        // 1. Hover on Left Half (Card 0, Sep 15) -> Popover takes right half
        const cellLeft = cards[0].querySelector('.mini-day-cell:not(.other-month)');
        window.app.showDaySchedulePopover(cellLeft, new Date(2026, 8, 15));
        const leftHoverStyle = {
          left: popover.style.left,
          width: popover.style.width,
          top: popover.style.top,
          height: popover.style.height
        };

        // 2. Hover on Right Half (Card 1, Oct 24) -> Popover takes left half
        const cellRight = cards[1].querySelector('.mini-day-cell:not(.other-month)');
        window.app.showDaySchedulePopover(cellRight, new Date(2026, 9, 24));
        const rightHoverStyle = {
          left: popover.style.left,
          width: popover.style.width,
          top: popover.style.top,
          height: popover.style.height
        };

        // Wait for fade-in animation to fully settle to verify bounding rect
        await new Promise(r => setTimeout(r, 250));
        const popRectSettled = popover.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();

        // 3. Test hide
        window.app.hidePopover();
        const isHiddenAfter = popover?.classList.contains('hidden');

        return {
          mainTop: main.offsetTop + 'px',
          mainHeight: main.offsetHeight + 'px',
          quadLeft: quad.offsetLeft,
          quadWidth: quad.offsetWidth,
          leftHoverStyle,
          rightHoverStyle,
          popRectSettled: {
            left: Math.round(popRectSettled.left),
            width: Math.round(popRectSettled.width),
            top: Math.round(popRectSettled.top),
            height: Math.round(popRectSettled.height)
          },
          mainRect: {
            top: Math.round(mainRect.top),
            height: Math.round(mainRect.height)
          },
          isHiddenAfter
        };
      })()
    `);

    // Verify hover on Left Half -> popover on Right Half with full main height
    assert.strictEqual(res.leftHoverStyle.left, '329px', 'Hovering left cell must position popover at right column (329px)');
    assert.strictEqual(res.leftHoverStyle.width, '313px', 'Popover width must match column width (313px)');
    assert.strictEqual(res.leftHoverStyle.top, res.mainTop, 'Popover top must align with main top (62px)');
    assert.strictEqual(res.leftHoverStyle.height, res.mainHeight, 'Popover height must equal main height (436px)');

    // Verify hover on Right Half -> popover on Left Half with full main height
    assert.strictEqual(res.rightHoverStyle.left, '8px', 'Hovering right cell must position popover at left column (8px)');
    assert.strictEqual(res.rightHoverStyle.width, '313px', 'Popover width must match column width (313px)');
    assert.strictEqual(res.rightHoverStyle.top, res.mainTop, 'Popover top must align with main top (62px)');
    assert.strictEqual(res.rightHoverStyle.height, res.mainHeight, 'Popover height must equal main height (436px)');

    // Verify settled bounding rect matches main height (allowing 1px subpixel tolerance)
    assert.ok(Math.abs(res.popRectSettled.height - res.mainRect.height) <= 1, 'Settled popover height must match main viewport height');
    assert.ok(Math.abs(res.popRectSettled.top - res.mainRect.top) <= 1, 'Settled popover top must match main viewport top');
    assert.strictEqual(res.popRectSettled.left, 8, 'Settled popover left on left hover must match left column');

    assert.strictEqual(res.isHiddenAfter, true, 'Popover should hide cleanly');
  });

  await t.test('Reopening / re-initializing app always goes back to default 4-month view', async () => {
    const res = await browser.eval(`
      (async () => {
        // 1. User switches to 1-month view
        window.app.setQuadView(false);
        await new Promise(r => setTimeout(r, 100));
        const wasSingle = !document.body.classList.contains('view-quad');

        // 2. Simulate closing and opening the app again (fresh init())
        await window.app.init();
        await new Promise(r => setTimeout(r, 100));

        const isQuadAfterReopen = document.body.classList.contains('view-quad');
        const zoomBtnActive = document.getElementById('zoomViewBtn')?.classList.contains('active');
        const quadContainerVisible = !document.getElementById('quadMonthContainer')?.classList.contains('hidden');

        return {
          wasSingle,
          isQuadAfterReopen,
          zoomBtnActive,
          quadContainerVisible
        };
      })()
    `);

    assert.strictEqual(res.wasSingle, true, 'Should have switched to single view in session');
    assert.strictEqual(res.isQuadAfterReopen, true, 'Reopening app must reset to default 4-month view');
    assert.strictEqual(res.zoomBtnActive, true, 'Zoom button must be active in default 4-month view');
    assert.strictEqual(res.quadContainerVisible, true, 'Quad container must be visible in default 4-month view');
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

  await t.test('Arrow key navigation in 4-month view never duplicates cards and applies directional scan animations', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.setQuadView(true);

        // Test backward arrow navigation
        await window.app.navigateMonth(-1);
        const backwardCards = Array.from(document.querySelectorAll('.mini-month-card'));
        const backwardNavDir = window.app.navDirection;
        const backwardHasReverseAnim = Array.from(document.querySelectorAll('.mini-day-cell'))
          .some(c => c.classList.contains('scan-appear-reverse') || c.classList.contains('scan-appear-other-reverse'));

        // Test forward arrow navigation
        await window.app.navigateMonth(1);
        const forwardCards = Array.from(document.querySelectorAll('.mini-month-card'));
        const forwardNavDir = window.app.navDirection;
        const forwardHasAnim = Array.from(document.querySelectorAll('.mini-day-cell'))
          .some(c => c.classList.contains('scan-appear') || c.classList.contains('scan-appear-other'));

        // Test rapid arrow key presses (overlapping calls)
        const rapidPromises = [
          window.app.navigateMonth(-1),
          window.app.navigateMonth(-1),
          window.app.navigateMonth(1),
          window.app.navigateMonth(-1)
        ];
        await Promise.all(rapidPromises);
        await new Promise(r => setTimeout(r, 100));

        const rapidCards = Array.from(document.querySelectorAll('.mini-month-card'));
        return {
          backwardCardCount: backwardCards.length,
          backwardNavDir,
          backwardHasReverseAnim,
          forwardCardCount: forwardCards.length,
          forwardNavDir,
          forwardHasAnim,
          rapidCardCount: rapidCards.length
        };
      })()
    `);

    assert.strictEqual(res.backwardCardCount, 4, 'Must have exactly 4 cards on backward navigation');
    assert.strictEqual(res.backwardNavDir, 'backward', 'navDirection should be backward');
    assert.strictEqual(res.backwardHasReverseAnim, true, 'Mini day cells must have scan-appear-reverse animation class');
    assert.strictEqual(res.forwardCardCount, 4, 'Must have exactly 4 cards on forward navigation');
    assert.strictEqual(res.forwardNavDir, 'forward', 'navDirection should be forward');
    assert.strictEqual(res.forwardHasAnim, true, 'Mini day cells must have scan-appear animation class');
    assert.strictEqual(res.rapidCardCount, 4, 'Rapid navigation must NEVER duplicate cards (strictly 4 cards)');
  });

  await t.test('Config modal in 4-month view utilizes full space (not just middle)', async () => {
    const res = await browser.eval(`
      (() => {
        window.app.setQuadView(true);
        window.app.openSettings();

        const modalCard = document.querySelector('.modal-card');
        const modalBackdrop = document.querySelector('.modal-backdrop');
        const cardRect = modalCard.getBoundingClientRect();
        const backdropRect = modalBackdrop.getBoundingClientRect();

        window.app.closeSettings();

        return {
          cardWidth: cardRect.width,
          backdropWidth: backdropRect.width,
          cardHeight: cardRect.height,
          backdropHeight: backdropRect.height
        };
      })()
    `);

    assert.ok(res.cardWidth > 600, `Modal card width in 4-month view (${res.cardWidth}px) should use full space (>600px)`);
    assert.ok(res.cardHeight > 480, `Modal card height in 4-month view (${res.cardHeight}px) should use full space (>480px)`);
  });

  await t.test('Bottom line shows month range on arrow navigation in 4-month view and view switch statuses', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.viewYear = 2026;
        window.app.viewMonth = 9; // October 2026 -> 4-month range: Sep - Dec 2026
        window.app.setQuadView(true);

        const rangeStr = window.app.getQuadViewRangeString();

        // 1. Arrow navigation in 4-month view
        let toastCaptured = '';
        const originalShowToast = window.app.showToast;
        window.app.showToast = (msg) => {
          toastCaptured = msg;
        };

        await window.app.navigateMonth(1); // Nov 2026 -> Oct 2026 - Jan 2027
        const forwardToast = toastCaptured;

        await window.app.navigateMonth(-1); // back to Oct 2026 -> Sep - Dec 2026
        const backwardToast = toastCaptured;

        // 2. Switch from 4-month view to 1-month view
        const firstCard = document.querySelector('.mini-month-card');
        firstCard.click();
        await new Promise(r => setTimeout(r, 120));
        const toSingleToast = toastCaptured;

        // 3. Switch back from 1-month view to 4-month view
        const zoomBtn = document.getElementById('zoomViewBtn');
        zoomBtn.click();
        const toQuadToast = toastCaptured;

        window.app.showToast = originalShowToast;

        return {
          rangeStr,
          forwardToast,
          backwardToast,
          toSingleToast,
          toQuadToast
        };
      })()
    `);

    assert.strictEqual(res.rangeStr, 'Sep - Dec 2026');
    assert.strictEqual(res.forwardToast, 'cal-1 ➜ Oct 2026 - Jan 2027', 'Forward navigation in 4-month view should show month range');
    assert.strictEqual(res.backwardToast, 'cal-1 ➜ Sep - Dec 2026', 'Backward navigation in 4-month view should show month range');
    assert.ok(res.toSingleToast.includes('1-Month View'), `Status should indicate 1-Month View: ${res.toSingleToast}`);
    assert.ok(res.toQuadToast.includes('4-Month View'), `Status should indicate 4-Month View: ${res.toQuadToast}`);
  });

  await t.test('Today cell and weekday header blink in 4-month view and stop on user interaction', async () => {
    const res = await browser.eval(`
      (async () => {
        const now = new Date();
        window.app.viewYear = now.getFullYear();
        window.app.viewMonth = now.getMonth();
        window.app.setQuadView(true);
        await window.app.renderQuadView(false);

        const todayMiniCell = document.querySelector('.mini-day-cell.is-today:not(.other-month)');
        const todayMiniWeekday = document.querySelector('.mini-weekday-col.is-today');

        const cellBlinkingBefore = todayMiniCell ? todayMiniCell.classList.contains('today-blinking') : false;
        const weekdayBlinkingBefore = todayMiniWeekday ? todayMiniWeekday.classList.contains('today-blinking') : false;

        const cellAnimName = todayMiniCell ? window.getComputedStyle(todayMiniCell).animationName : '';
        const weekdayAnimName = todayMiniWeekday ? window.getComputedStyle(todayMiniWeekday).animationName : '';

        window.app.stopTodayBlinking();

        const cellBlinkingAfter = todayMiniCell ? todayMiniCell.classList.contains('today-blinking') : false;
        const weekdayBlinkingAfter = todayMiniWeekday ? todayMiniWeekday.classList.contains('today-blinking') : false;
        const cellStillToday = todayMiniCell ? todayMiniCell.classList.contains('is-today') : false;
        const weekdayStillToday = todayMiniWeekday ? todayMiniWeekday.classList.contains('is-today') : false;

        return {
          hasTodayMiniCell: !!todayMiniCell,
          hasTodayMiniWeekday: !!todayMiniWeekday,
          cellBlinkingBefore,
          weekdayBlinkingBefore,
          cellAnimName,
          weekdayAnimName,
          cellBlinkingAfter,
          weekdayBlinkingAfter,
          cellStillToday,
          weekdayStillToday
        };
      })()
    `);

    assert.strictEqual(res.hasTodayMiniCell, true, '4-month view must have a .mini-day-cell.is-today');
    assert.strictEqual(res.hasTodayMiniWeekday, true, '4-month view must have a .mini-weekday-col.is-today');
    assert.strictEqual(res.cellBlinkingBefore, true, 'Today mini cell should have .today-blinking initially');
    assert.strictEqual(res.weekdayBlinkingBefore, true, 'Today mini weekday header should have .today-blinking initially');
    assert.strictEqual(res.cellAnimName, 'todayBlink', 'Today mini cell should run todayBlink animation');
    assert.strictEqual(res.weekdayAnimName, 'weekdayTodayBlink', 'Today mini weekday should run weekdayTodayBlink animation');
    assert.strictEqual(res.cellBlinkingAfter, false, 'Today mini cell should stop blinking on user interaction');
    assert.strictEqual(res.weekdayBlinkingAfter, false, 'Today mini weekday should stop blinking on user interaction');
    assert.strictEqual(res.cellStillToday, true, 'Today mini cell must remain .is-today after blinking stops');
    assert.strictEqual(res.weekdayStillToday, true, 'Today mini weekday must remain .is-today after blinking stops');
  });
});
