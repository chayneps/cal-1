// tests/e2e/holidays.test.js
const test = require('node:test');
const assert = require('node:assert');
const { TestBrowser } = require('../helpers/test-browser.js');

test('E2E Regression: Public Holidays', async (t) => {
  const browser = new TestBrowser({ port: 8891, debugPort: 9251 });
  await browser.start();

  t.after(() => {
    browser.close();
  });

  await t.test('Holiday country dropdown order and structure', async () => {
    const info = await browser.eval(`
      (() => {
        const sel = document.getElementById('holidayCountrySelect');
        if (!sel) return null;
        const options = Array.from(sel.options).map(o => ({
          value: o.value,
          text: o.textContent.trim(),
          disabled: o.disabled
        }));
        return {
          total: options.length,
          first5: options.slice(0, 5)
        };
      })()
    `);

    assert.ok(info, 'Dropdown should exist');
    assert.strictEqual(info.first5[0].value, '', 'Option 0 should be disabled/none');
    assert.strictEqual(info.first5[1].value, 'CA', 'Option 1 should be Canada (CA)');
    assert.strictEqual(info.first5[2].value, 'US', 'Option 2 should be United States (US)');
    assert.strictEqual(info.first5[3].value, 'TH', 'Option 3 should be Thailand (TH)');
    assert.strictEqual(info.first5[4].disabled, true, 'Option 4 should be disabled divider');
  });

  await t.test('Selecting Thailand displays * on holidays and popover banner', async () => {
    const res = await browser.eval(`
      (async () => {
        const sel = document.getElementById('holidayCountrySelect');
        sel.value = 'TH';
        sel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 600));

        const d13 = document.querySelector('.day-cell[data-date="2026-10-13"]');
        const d23 = document.querySelector('.day-cell[data-date="2026-10-23"]');
        const d14 = document.querySelector('.day-cell[data-date="2026-10-14"]');

        // Open popover on Oct 13
        window.app.showDaySchedulePopover(d13, new Date(2026, 9, 13));

        const banner = document.getElementById('popoverHolidayBanner');
        const hName = document.getElementById('popoverHolidayName');
        const hLocal = document.getElementById('popoverHolidayLocal');
        const emptyTitle = document.querySelector('.schedule-empty .empty-title');
        const emptyDesc = document.querySelector('.schedule-empty .empty-desc');

        return {
          d13Holiday: d13?.classList.contains('is-holiday'),
          d13Star: d13?.querySelector('.holiday-star')?.textContent,
          d23Holiday: d23?.classList.contains('is-holiday'),
          d14Holiday: d14?.classList.contains('is-holiday'),
          bannerVisible: banner ? !banner.classList.contains('hidden') : false,
          holidayName: hName?.textContent,
          holidayLocal: hLocal?.textContent,
          emptyTitle: emptyTitle?.textContent,
          emptyDesc: emptyDesc?.textContent
        };
      })()
    `);

    assert.strictEqual(res.d13Holiday, true, 'Oct 13 should have is-holiday');
    assert.strictEqual(res.d13Star, '*', 'Oct 13 should have * indicator');
    assert.strictEqual(res.d23Holiday, true, 'Oct 23 should have is-holiday');
    assert.strictEqual(res.d14Holiday, false, 'Oct 14 should not be holiday');
    assert.strictEqual(res.bannerVisible, true, 'Popover banner should be visible');
    assert.strictEqual(res.holidayName, 'King Bhumibol Memorial Day');
    assert.strictEqual(res.holidayLocal, 'วันนวมินทรมหาราช');
    assert.strictEqual(res.emptyTitle, 'Public Holiday');
    assert.ok(res.emptyDesc.includes('Enjoy your day off!'), 'Empty state should acknowledge day off');
  });

  await t.test('Selecting United States displays US holidays', async () => {
    const res = await browser.eval(`
      (async () => {
        const sel = document.getElementById('holidayCountrySelect');
        sel.value = 'US';
        sel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 600));

        const d12 = document.querySelector('.day-cell[data-date="2026-10-12"]');
        window.app.showDaySchedulePopover(d12, new Date(2026, 9, 12));

        const banner = document.getElementById('popoverHolidayBanner');
        const hName = document.getElementById('popoverHolidayName');

        return {
          d12Holiday: d12?.classList.contains('is-holiday'),
          d12Star: d12?.querySelector('.holiday-star')?.textContent,
          bannerVisible: banner ? !banner.classList.contains('hidden') : false,
          holidayName: hName?.textContent
        };
      })()
    `);

    assert.strictEqual(res.d12Holiday, true, 'US Columbus Day on Oct 12 should have is-holiday');
    assert.strictEqual(res.d12Star, '*');
    assert.strictEqual(res.bannerVisible, true);
    assert.strictEqual(res.holidayName, 'Columbus Day');
  });

  await t.test('Country setting persistence across app reopen (reload)', async () => {
    // 1. Select Canada
    await browser.eval(`
      (async () => {
        const sel = document.getElementById('holidayCountrySelect');
        sel.value = 'CA';
        sel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 500));
      })()
    `);

    // 2. Reload page (reopening extension)
    await browser.reload();

    // 3. Verify Canada is restored
    const state = await browser.eval(`
      (() => {
        const sel = document.getElementById('holidayCountrySelect');
        const d12 = document.querySelector('.day-cell[data-date="2026-10-12"]');
        return {
          selectedValue: sel?.value,
          appCountry: window.app?.holidayCountry,
          d12Holiday: d12?.classList.contains('is-holiday'),
          d12Star: d12?.querySelector('.holiday-star')?.textContent
        };
      })()
    `);

    assert.strictEqual(state.selectedValue, 'CA', 'Selected value in dropdown should persist as CA');
    assert.strictEqual(state.appCountry, 'CA', 'App holidayCountry should persist as CA');
    assert.strictEqual(state.d12Holiday, true, 'Canadian Thanksgiving should be marked as holiday');
    assert.strictEqual(state.d12Star, '*');
  });

  await t.test('Selecting holiday in config immediately updates 4-month quad view and 1-month view after clicking Done', async () => {
    const res = await browser.eval(`
      (async () => {
        // Ensure 4-month view active
        window.app.setQuadView(true);

        // Open settings, select Thailand (TH), and click Done
        window.app.openSettings();
        const sel = document.getElementById('holidayCountrySelect');
        sel.value = 'TH';
        sel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 200));

        document.getElementById('closeModalFooterBtn').click();
        await new Promise(r => setTimeout(r, 200));

        const thQuadStars = Array.from(document.querySelectorAll('.mini-holiday-star')).map(s => s.title);

        // Open settings, select None (Disabled), and click Done
        window.app.openSettings();
        sel.value = '';
        sel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 200));

        document.getElementById('closeModalFooterBtn').click();
        await new Promise(r => setTimeout(r, 200));

        const disabledQuadStars = document.querySelectorAll('.mini-holiday-star').length;

        // In 1-month view, select Thailand again
        window.app.setQuadView(false);
        window.app.openSettings();
        sel.value = 'TH';
        sel.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 200));

        document.getElementById('closeModalFooterBtn').click();
        await new Promise(r => setTimeout(r, 200));

        const singleViewThStars = document.querySelectorAll('#monthGrid .holiday-star').length;

        return {
          thQuadStarsCount: thQuadStars.length,
          thQuadStars,
          disabledQuadStars,
          singleViewThStars
        };
      })()
    `);

    assert.ok(res.thQuadStarsCount > 0, `4-month view must display holiday stars when selected (${res.thQuadStarsCount} found)`);
    assert.strictEqual(res.disabledQuadStars, 0, '4-month view must remove holiday stars when disabled');
    assert.ok(res.singleViewThStars > 0, '1-month view must display holiday stars when selected');
  });
});
