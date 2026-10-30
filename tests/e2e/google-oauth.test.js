// tests/e2e/google-oauth.test.js
const test = require('node:test');
const assert = require('node:assert');
const { TestBrowser } = require('../helpers/test-browser.js');

test('E2E Regression: Google Calendar REST API & Multi-Calendar UI', async (t) => {
  const browser = new TestBrowser({ port: 8895, debugPort: 9255 });
  await browser.start();

  t.after(() => {
    browser.close();
  });

  await t.test('Google Sign-In button exists and Client ID config is streamlined/hard-coded', async () => {
    const res = await browser.eval(`
      (async () => {
        const { GoogleCalendarApi } = await import('../../lib/google-api.js');
        const btn = document.getElementById('googleSignInBtn');
        const disconnectedCard = document.getElementById('googleDisconnectedCard');
        const connectedCard = document.getElementById('googleConnectedCard');
        const clientIdInput = document.getElementById('googleClientIdInput');
        const clientDetails = document.getElementById('googleClientDetails');
        const icalSection = document.querySelector('.alt-connection-details');

        return {
          hasBtn: !!btn,
          btnText: btn ? btn.textContent.trim() : '',
          disconnectedCardVisible: !disconnectedCard.classList.contains('hidden'),
          connectedCardHidden: connectedCard.classList.contains('hidden'),
          hasClientIdInput: !!clientIdInput,
          hasClientDetails: !!clientDetails,
          hasIcalSection: !!icalSection,
          hardcodedClientId: GoogleCalendarApi.DEFAULT_CLIENT_ID
        };
      })()
    `);

    assert.strictEqual(res.hasBtn, true, 'Google Sign-In button must exist');
    assert.match(res.btnText, /Sign in with Google/i);
    assert.strictEqual(res.disconnectedCardVisible, true, 'Disconnected state should be initially active');
    assert.strictEqual(res.connectedCardHidden, true, 'Connected state should be initially hidden');
    assert.strictEqual(res.hasClientIdInput, false, 'Manual Client ID input should be removed');
    assert.strictEqual(res.hasClientDetails, false, 'Manual Client ID details should be removed');
    assert.strictEqual(res.hasIcalSection, true, 'iCal fallback section should exist');
    assert.match(res.hardcodedClientId, /apps\.googleusercontent\.com$/, 'Client ID should be hardcoded in GoogleCalendarApi');
  });

  await t.test('Connected account displays multi-calendar list with colors and toggles', async () => {
    const res = await browser.eval(`
      (async () => {
        // Mock connected Google state
        window.app.googleAuthToken = 'mock_access_token_xyz';
        window.app.googleUserEmail = 'user@example.com';
        window.app.googleCalendars = [
          { id: 'cal-1', summary: 'Personal', backgroundColor: '#4285F4', primary: true, selected: true },
          { id: 'cal-2', summary: 'Work Meetings', backgroundColor: '#0B8043', primary: false, selected: true },
          { id: 'cal-3', summary: 'Holidays in Thailand', backgroundColor: '#8E24AA', primary: false, selected: false }
        ];

        window.app.showGoogleConnectedState(true);
        window.app.renderGoogleCalendarsList();

        const emailEl = document.getElementById('googleAccountEmail');
        const items = Array.from(document.querySelectorAll('.google-cal-item')).map(item => ({
          text: item.querySelector('.cal-name').textContent.trim(),
          color: item.querySelector('.cal-color-dot').style.backgroundColor,
          checked: item.querySelector('input[type="checkbox"]').checked
        }));

        return {
          displayedEmail: emailEl ? emailEl.textContent.trim() : '',
          connectedCardVisible: !document.getElementById('googleConnectedCard').classList.contains('hidden'),
          disconnectedCardHidden: document.getElementById('googleDisconnectedCard').classList.contains('hidden'),
          items
        };
      })()
    `);

    assert.strictEqual(res.displayedEmail, 'user@example.com');
    assert.strictEqual(res.connectedCardVisible, true);
    assert.strictEqual(res.disconnectedCardHidden, true);
    assert.strictEqual(res.items.length, 3);
    assert.match(res.items[0].text, /Personal \(Primary\)/);
    assert.strictEqual(res.items[0].checked, true);
    assert.strictEqual(res.items[1].text, 'Work Meetings');
    assert.strictEqual(res.items[1].checked, true);
    assert.strictEqual(res.items[2].text, 'Holidays in Thailand');
    assert.strictEqual(res.items[2].checked, false);
  });

  await t.test('Toggling calendar checkbox updates selected state', async () => {
    const res = await browser.eval(`
      (async () => {
        const checkboxes = document.querySelectorAll('.google-cal-item input[type="checkbox"]');
        // Toggle the 3rd calendar from unchecked to checked
        checkboxes[2].click();
        await new Promise(r => setTimeout(r, 100));

        return {
          cal3Selected: window.app.googleCalendars[2].selected
        };
      })()
    `);

    assert.strictEqual(res.cal3Selected, true, 'Third calendar should now be selected');
  });

  await t.test('Top-line displays joined names when <=3 calendars selected and "all" when >3 calendars', async () => {
    const res = await browser.eval(`
      (async () => {
        // Reset to initial test state with cal-1 and cal-2 selected, cal-3 unselected
        window.app.useDemoData = false;
        window.app.googleAuthToken = 'mock_access_token_xyz';
        window.app.googleCalendars[0].selected = true;
        window.app.googleCalendars[1].selected = true;
        window.app.googleCalendars[2].selected = false;
        window.app.activeCalendarFilter = 'all';
        window.app.updateCalendarHeader();

        const name0 = document.getElementById('spCalendarName').textContent;

        // Click 1: cycles to first selected calendar (Personal)
        await window.app.cycleOrSelectCalendar();
        const name1 = document.getElementById('spCalendarName').textContent;
        const filter1 = window.app.activeCalendarFilter;

        // Click 2: cycles to second selected calendar (Work Meetings)
        await window.app.cycleOrSelectCalendar();
        const name2 = document.getElementById('spCalendarName').textContent;
        const filter2 = window.app.activeCalendarFilter;

        // Click 3: cycles back to combined (skipping unselected cal-3)
        await window.app.cycleOrSelectCalendar();
        const name3 = document.getElementById('spCalendarName').textContent;
        const filter3 = window.app.activeCalendarFilter;

        // Test with 3 calendars selected: cal-1, cal-2, and cal-3
        window.app.googleCalendars[2].selected = true;
        window.app.googleCalendars[2].summary = 'Birthdays';
        window.app.activeCalendarFilter = 'all';
        window.app.updateCalendarHeader();
        const name3Cals = document.getElementById('spCalendarName').textContent;

        // Test with 4 calendars selected: should use "all"
        window.app.googleCalendars.push({ id: 'cal-4', summary: 'Tasks', selected: true });
        window.app.updateCalendarHeader();
        const name4Cals = document.getElementById('spCalendarName').textContent;

        // Test with email calendar and (Primary) suffix: should strip domain and (Primary)
        const formattedEmail = window.app.formatCalendarShortName('pumisake@gmail.com (Primary)');
        const formattedPrimary = window.app.formatCalendarShortName('Family (Primary)');

        // Clean up added 4th calendar
        window.app.googleCalendars.pop();

        return {
          name0,
          name1,
          filter1,
          name2,
          filter2,
          name3,
          filter3,
          name3Cals,
          name4Cals,
          formattedEmail,
          formattedPrimary
        };
      })()
    `);

    assert.strictEqual(res.name0, 'Personal+Work Meetings', 'Initial state with 2 calendars should be "Personal+Work Meetings"');
    assert.strictEqual(res.name1, 'Personal', 'First cycle should be "Personal"');
    assert.strictEqual(res.filter1, 'cal-1');
    assert.strictEqual(res.name2, 'Work Meetings', 'Second cycle should be "Work Meetings"');
    assert.strictEqual(res.filter2, 'cal-2');
    assert.strictEqual(res.name3, 'Personal+Work Meetings', 'Third cycle should return to "Personal+Work Meetings"');
    assert.strictEqual(res.filter3, 'all');
    assert.strictEqual(res.name3Cals, 'Personal+Work Meetings+Birthdays', '3 calendars should join with "+"');
    assert.strictEqual(res.name4Cals, 'all', '4 calendars should display "all"');
    assert.strictEqual(res.formattedEmail, 'pumisake', 'Email calendar should strip domain and (Primary)');
    assert.strictEqual(res.formattedPrimary, 'Family', 'Calendar with (Primary) should strip suffix');
  });

  await t.test('Disconnecting Google account resets state and returns to disconnected card', async () => {
    const res = await browser.eval(`
      (async () => {
        await window.app.handleGoogleDisconnect();
        await new Promise(r => setTimeout(r, 100));

        return {
          hasToken: !!window.app.googleAuthToken,
          userEmail: window.app.googleUserEmail,
          calendarsCount: window.app.googleCalendars.length,
          connectedHidden: document.getElementById('googleConnectedCard').classList.contains('hidden'),
          disconnectedVisible: !document.getElementById('googleDisconnectedCard').classList.contains('hidden')
        };
      })()
    `);

    assert.strictEqual(res.hasToken, false, 'Auth token should be cleared');
    assert.strictEqual(res.userEmail, '', 'User email should be empty');
    assert.strictEqual(res.calendarsCount, 0, 'Calendars should be cleared');
    assert.strictEqual(res.connectedHidden, true, 'Connected card must be hidden');
    assert.strictEqual(res.disconnectedVisible, true, 'Disconnected card must be visible');
  });

  await t.test('Auth expired alert appears on the bottom line (SYNC:) and clicking it triggers reconnect', async () => {
    const res = await browser.eval(`
      (async () => {
        // Reset toast animation and mock connected Google state
        window.app.isToastAnimating = false;
        window.app.hasAuthExpired = false;
        window.app.useDemoData = false;
        window.app.googleAuthToken = 'expired_mock_token';
        window.app.googleUserEmail = 'user@example.com';
        window.app.lastSyncTimestamp = Date.now();
        await window.app.updateFooterSync(false);

        const initialFooterText = document.getElementById('lastSyncTimeText')?.textContent;

        // Simulate an unrecoverable auth expiration error
        window.app.hasAuthExpired = true;
        await window.app.updateFooterSync(false);

        const expiredElem = document.getElementById('lastSyncTimeText');
        const expiredFooterText = expiredElem?.textContent;
        const hasExpiredClass = expiredElem?.classList.contains('auth-expired');
        const role = expiredElem?.getAttribute('role');

        let signInTriggered = false;
        const originalSignIn = window.app.handleGoogleSignIn;
        window.app.handleGoogleSignIn = () => {
          signInTriggered = true;
        };

        // Click the bottom line where SYNC: is
        expiredElem.click();

        window.app.handleGoogleSignIn = originalSignIn;

        return {
          initialFooterText,
          expiredFooterText,
          hasExpiredClass,
          role,
          signInTriggered
        };
      })()
    `);

    assert.ok(res.initialFooterText.includes('SYNC:'), 'Initial footer text should have SYNC:');
    assert.strictEqual(res.expiredFooterText, 'SYNC: AUTH EXPIRED ➜ Click to Reconnect', 'Bottom line must show clear auth expired reconnect alert');
    assert.strictEqual(res.hasExpiredClass, true, 'Footer element must have auth-expired class');
    assert.strictEqual(res.role, 'button', 'Footer element must have role="button" for accessibility');
    assert.strictEqual(res.signInTriggered, true, 'Clicking bottom line alert must trigger Google Sign-In');
  });

  await t.test('Bottom line transitions follow the convention: remove right-to-left and write left-to-right', async () => {
    const res = await browser.eval(`
      (async () => {
        const elem = document.getElementById('lastSyncTimeText');
        window.app.isToastAnimating = false;
        elem.textContent = 'SYNC: HELLO WORLD';

        const history = [];
        const interval = setInterval(() => {
          history.push(elem.textContent);
        }, 3);

        await window.app.transitionFooterText('SYNC: GOODBYE', { animate: true });
        clearInterval(interval);
        history.push(elem.textContent);

        let sawShrinking = false;
        let sawGrowing = false;
        let sawEmpty = false;

        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1];
          const curr = history[i];
          if (curr.length < prev.length && prev.startsWith(curr)) {
            sawShrinking = true;
          }
          if (curr === '') {
            sawEmpty = true;
          }
          if (sawEmpty && curr.length > prev.length && 'SYNC: GOODBYE'.startsWith(curr)) {
            sawGrowing = true;
          }
        }

        return {
          finalText: elem.textContent,
          sawShrinking,
          sawGrowing,
          sawEmpty
        };
      })()
    `);

    assert.strictEqual(res.finalText, 'SYNC: GOODBYE', 'Final text must match target text');
    assert.strictEqual(res.sawShrinking, true, 'Old text must be removed from right to left (backspaced)');
    assert.strictEqual(res.sawEmpty, true, 'Line should clear before writing new text');
    assert.strictEqual(res.sawGrowing, true, 'New text must be written from left to right (typed)');
  });

  await t.test('Calendar selection in config arranges like in Google (My calendars & Other calendars with Birthdays and Tasks)', async () => {
    const res = await browser.eval(`
      (async () => {
        window.app.googleAuthToken = 'mock_token';
        window.app.googleCalendars = [
          { id: 'primary-id', summary: 'Pumisake Snamchaiskul', primary: true, accessRole: 'owner', backgroundColor: '#E8710A', selected: true },
          { id: 'addressbook#contacts@group.v.calendar.google.com', summary: 'Birthdays', primary: false, accessRole: 'reader', backgroundColor: '#9a9cff', selected: false },
          { id: 'family-id', summary: 'Family', primary: false, accessRole: 'owner', backgroundColor: '#B3C835', selected: true },
          { id: 'tasks', summary: 'Tasks', primary: false, accessRole: 'owner', backgroundColor: '#039BE5', selected: true },
          { id: 'holidays-ca', summary: 'Holidays in Canada', primary: false, accessRole: 'reader', backgroundColor: '#34A853', selected: true },
          { id: 'holidays-th', summary: 'Holidays in Thailand', primary: false, accessRole: 'reader', backgroundColor: '#795548', selected: true },
          { id: 'fei-wu-id', summary: 'Fei Wu', primary: false, accessRole: 'reader', backgroundColor: '#8E24AA', selected: false }
        ];

        window.app.renderGoogleCalendarsList();

        const sections = Array.from(document.querySelectorAll('.google-cal-section')).map(sec => {
          const title = sec.querySelector('.section-title')?.textContent.trim();
          const items = Array.from(sec.querySelectorAll('.google-cal-item')).map(item => ({
            name: item.querySelector('.cal-name')?.textContent.trim(),
            checked: item.querySelector('input[type="checkbox"]')?.checked,
            hasCheckIcon: Boolean(item.querySelector('.cal-check-icon'))
          }));
          return { title, items };
        });

        // Test collapsing
        const myHeader = document.querySelector('.google-cal-section[data-section="my"] .google-cal-section-header');
        myHeader.click();
        const isCollapsedAfterClick = document.querySelector('.google-cal-section[data-section="my"]').classList.contains('collapsed');

        // Uncollapse
        myHeader.click();
        const isCollapsedAfterSecondClick = document.querySelector('.google-cal-section[data-section="my"]').classList.contains('collapsed');

        return {
          sections,
          isCollapsedAfterClick,
          isCollapsedAfterSecondClick
        };
      })()
    `);

    assert.strictEqual(res.sections.length, 2, 'Should render exactly two sections');
    assert.strictEqual(res.sections[0].title, 'My calendars');
    assert.deepStrictEqual(
      res.sections[0].items.map(i => i.name.replace(' (Primary)', '')),
      ['Pumisake Snamchaiskul', 'Birthdays', 'Family', 'Tasks'],
      'My calendars must match screenshot order and grouping'
    );
    assert.strictEqual(res.sections[0].items[0].checked, true);
    assert.strictEqual(res.sections[0].items[1].checked, false, 'Birthdays should be unchecked matching screenshot');
    assert.strictEqual(res.sections[0].items[2].checked, true);
    assert.strictEqual(res.sections[0].items[3].checked, true, 'Tasks should be checked matching screenshot');

    assert.strictEqual(res.sections[1].title, 'Other calendars');
    assert.deepStrictEqual(
      res.sections[1].items.map(i => i.name),
      ['Holidays in Canada', 'Holidays in Thailand', 'Fei Wu'],
      'Other calendars must match screenshot grouping'
    );
    assert.strictEqual(res.sections[1].items[0].checked, true);
    assert.strictEqual(res.sections[1].items[1].checked, true);
    assert.strictEqual(res.sections[1].items[2].checked, false);

    assert.strictEqual(res.isCollapsedAfterClick, true, 'Section header click should collapse section');
    assert.strictEqual(res.isCollapsedAfterSecondClick, false, 'Second click should uncollapse section');
  });

  await t.test('First login selects only Primary calendar, while relogin preserves selections', async () => {
    const res = await browser.eval(`
      (async () => {
        const { Storage } = await import('../../lib/storage.js');
        const rawCalendars = [
          { id: 'primary-cal', summary: 'Personal (Primary)', primary: true, selected: true },
          { id: 'work-cal', summary: 'Work Meetings', primary: false, selected: true },
          { id: 'holidays-cal', summary: 'Holidays', primary: false, selected: true }
        ];

        // 1. First login scenario (no stored user email)
        await Storage.remove(['googleUserEmail', 'googleCalendars']);
        let firstLoginCals = JSON.parse(JSON.stringify(rawCalendars));
        
        const stored1 = await Storage.get(['googleUserEmail', 'googleCalendars']);
        const isRelogin1 = Boolean(
          stored1.googleUserEmail &&
          stored1.googleUserEmail.toLowerCase() === 'user@example.com'.toLowerCase() &&
          Array.isArray(stored1.googleCalendars) &&
          stored1.googleCalendars.length > 0
        );

        if (!isRelogin1) {
          const hasPrimary = firstLoginCals.some(c => c.primary);
          firstLoginCals.forEach((c, idx) => {
            c.selected = hasPrimary ? Boolean(c.primary) : (idx === 0);
          });
        }

        // 2. User customizes selections (selects work too) and saves
        firstLoginCals[1].selected = true; // user checked work
        await Storage.set({
          googleUserEmail: 'user@example.com',
          googleCalendars: firstLoginCals
        });

        // 3. Relogin to same account
        let reloginCals = JSON.parse(JSON.stringify(rawCalendars));
        const stored2 = await Storage.get(['googleUserEmail', 'googleCalendars']);
        const isRelogin2 = Boolean(
          stored2.googleUserEmail &&
          stored2.googleUserEmail.toLowerCase() === 'user@example.com'.toLowerCase() &&
          Array.isArray(stored2.googleCalendars) &&
          stored2.googleCalendars.length > 0
        );

        if (isRelogin2) {
          const prevMap = new Map((stored2.googleCalendars || []).map(c => [c.id, c.selected]));
          reloginCals.forEach(c => {
            if (prevMap.has(c.id)) {
              c.selected = prevMap.get(c.id);
            }
          });
        }

        // 4. Login with a NEW Google account
        let newAccountCals = JSON.parse(JSON.stringify(rawCalendars));
        const isRelogin3 = Boolean(
          stored2.googleUserEmail &&
          stored2.googleUserEmail.toLowerCase() === 'newperson@example.com'.toLowerCase() &&
          Array.isArray(stored2.googleCalendars) &&
          stored2.googleCalendars.length > 0
        );

        if (!isRelogin3) {
          const hasPrimary = newAccountCals.some(c => c.primary);
          newAccountCals.forEach((c, idx) => {
            c.selected = hasPrimary ? Boolean(c.primary) : (idx === 0);
          });
        }

        return {
          firstLoginPrimarySelected: firstLoginCals[0].selected,
          firstLoginWorkSelected: firstLoginCals[1].selected,
          firstLoginHolidaysSelected: firstLoginCals[2].selected,
          reloginPrimarySelected: reloginCals[0].selected,
          reloginWorkSelected: reloginCals[1].selected,
          reloginHolidaysSelected: reloginCals[2].selected,
          newAccountPrimarySelected: newAccountCals[0].selected,
          newAccountWorkSelected: newAccountCals[1].selected,
          newAccountHolidaysSelected: newAccountCals[2].selected
        };
      })()
    `);

    assert.strictEqual(res.firstLoginPrimarySelected, true, 'First login must select Primary');
    assert.strictEqual(res.firstLoginHolidaysSelected, false, 'First login must NOT select secondary calendar');
    assert.strictEqual(res.reloginPrimarySelected, true, 'Relogin preserves Primary selection');
    assert.strictEqual(res.reloginWorkSelected, true, 'Relogin preserves user-customized work selection');
    assert.strictEqual(res.reloginHolidaysSelected, false, 'Relogin preserves user-customized holidays unselected');
    assert.strictEqual(res.newAccountPrimarySelected, true, 'New account login must select Primary');
    assert.strictEqual(res.newAccountWorkSelected, false, 'New account login must NOT select work');
  });
});
