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

  await t.test('Google Sign-In button and OAuth elements exist in settings', async () => {
    const res = await browser.eval(`
      (() => {
        const btn = document.getElementById('googleSignInBtn');
        const disconnectedCard = document.getElementById('googleDisconnectedCard');
        const connectedCard = document.getElementById('googleConnectedCard');
        const redirectCode = document.getElementById('googleRedirectUriText');
        const clientIdInput = document.getElementById('googleClientIdInput');
        const icalSection = document.querySelector('.alt-connection-details');

        return {
          hasBtn: !!btn,
          btnText: btn ? btn.textContent.trim() : '',
          disconnectedCardVisible: !disconnectedCard.classList.contains('hidden'),
          connectedCardHidden: connectedCard.classList.contains('hidden'),
          redirectUriText: redirectCode ? redirectCode.textContent.trim() : '',
          hasClientIdInput: !!clientIdInput,
          hasIcalSection: !!icalSection
        };
      })()
    `);

    assert.strictEqual(res.hasBtn, true, 'Google Sign-In button must exist');
    assert.match(res.btnText, /Sign in with Google/i);
    assert.strictEqual(res.disconnectedCardVisible, true, 'Disconnected state should be initially active');
    assert.strictEqual(res.connectedCardHidden, true, 'Connected state should be initially hidden');
    assert.match(res.redirectUriText, /chromiumapp\.org/i, 'Redirect URI must point to chromiumapp.org');
    assert.strictEqual(res.hasClientIdInput, true, 'OAuth Client ID input should exist');
    assert.strictEqual(res.hasIcalSection, true, 'iCal fallback section should exist');
  });

  await t.test('Clicking Sign in with Google without Client ID expands details gracefully', async () => {
    const res = await browser.eval(`
      (async () => {
        const { GoogleCalendarApi } = await import('../../lib/google-api.js');
        const origDefault = GoogleCalendarApi.DEFAULT_CLIENT_ID;
        GoogleCalendarApi.DEFAULT_CLIENT_ID = '';

        window.app.customClientId = '';
        const input = document.getElementById('googleClientIdInput');
        if (input) input.value = '';

        const btn = document.getElementById('googleSignInBtn');
        btn.click();
        await new Promise(r => setTimeout(r, 150));

        GoogleCalendarApi.DEFAULT_CLIENT_ID = origDefault;

        const statusEl = document.getElementById('googleAuthStatus');
        const detailsEl = document.getElementById('googleClientDetails');

        return {
          detailsOpen: detailsEl.open,
          statusVisible: !statusEl.classList.contains('hidden'),
          statusText: statusEl.textContent.trim()
        };
      })()
    `);

    assert.strictEqual(res.detailsOpen, true, 'Details should be auto-expanded');
    assert.strictEqual(res.statusVisible, true, 'Status banner should be visible');
    assert.match(res.statusText, /OAuth Client ID is required/i);
  });

  await t.test('Saving OAuth Client ID persists to app state', async () => {
    const res = await browser.eval(`
      (async () => {
        const input = document.getElementById('googleClientIdInput');
        const saveBtn = document.getElementById('saveClientIdBtn');
        input.value = 'test-client-id-12345.apps.googleusercontent.com';
        saveBtn.click();
        await new Promise(r => setTimeout(r, 100));

        return {
          appClientId: window.app.customClientId,
          btnText: saveBtn.textContent.trim()
        };
      })()
    `);

    assert.strictEqual(res.appClientId, 'test-client-id-12345.apps.googleusercontent.com');
    assert.strictEqual(res.btnText, 'Saved!');
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
});
