// tests/unit/google-api.test.js - Unit tests for Google Calendar REST API client
const test = require('node:test');
const assert = require('node:assert');

test('Google Calendar REST API Unit Tests', async (t) => {
  // Setup global mock for chrome API if not present
  global.chrome = {
    identity: {
      getRedirectURL: () => 'https://mock-extension-id.chromiumapp.org/',
      launchWebAuthFlow: (opts, cb) => cb('https://mock-extension-id.chromiumapp.org/#access_token=mock_test_token&expires_in=3600'),
      removeCachedAuthToken: (opts, cb) => cb && cb()
    },
    runtime: {
      id: 'mock-extension-id',
      lastError: null,
      getManifest: () => ({ version: '1.0.0' })
    },
    storage: {
      local: {
        get: async (keys) => ({}),
        set: async (items) => {},
        remove: async (keys) => {}
      }
    }
  };

  const { GoogleCalendarApi } = await import('../../lib/google-api.js');

  await t.test('getRedirectUri and getExtensionId generate expected URI', () => {
    assert.strictEqual(GoogleCalendarApi.getExtensionId(), 'mock-extension-id');
    assert.strictEqual(GoogleCalendarApi.getRedirectUri(), 'https://mock-extension-id.chromiumapp.org/');
  });

  await t.test('authenticate throws CLIENT_ID_REQUIRED if no clientId is provided', async () => {
    // 1. Called with no arguments
    await assert.rejects(
      async () => {
        await GoogleCalendarApi.authenticate();
      },
      (err) => err.message === 'CLIENT_ID_REQUIRED' && err.code === 'CLIENT_ID_REQUIRED'
    );

    // 2. Called with object containing empty clientId
    await assert.rejects(
      async () => {
        await GoogleCalendarApi.authenticate({ clientId: '   ', interactive: true });
      },
      (err) => err.message === 'CLIENT_ID_REQUIRED' && err.code === 'CLIENT_ID_REQUIRED'
    );
  });

  await t.test('authenticate accepts object or string clientId without throwing TypeError', async () => {
    // Should accept options object { clientId, interactive }
    const res1 = await GoogleCalendarApi.authenticate({
      clientId: 'test-app.apps.googleusercontent.com',
      interactive: true
    });
    assert.strictEqual(res1.token, 'mock_test_token');

    // Should accept string clientId
    const res2 = await GoogleCalendarApi.authenticate('test-app.apps.googleusercontent.com', true);
    assert.strictEqual(res2.token, 'mock_test_token');
  });

  await t.test('getUserProfile fetches and parses user profile', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      assert.strictEqual(opts.headers.Authorization, 'Bearer test_token');
      return {
        ok: true,
        json: async () => ({
          email: 'developer@example.com',
          name: 'Developer Test'
        })
      };
    };

    try {
      const profile = await GoogleCalendarApi.getUserProfile('test_token');
      assert.strictEqual(profile.email, 'developer@example.com');
      assert.strictEqual(profile.name, 'Developer Test');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('getCalendarList parses multiple calendars with colors and primary flag', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      return {
        ok: true,
        json: async () => ({
          items: [
            { id: 'primary-id', summary: 'Personal', primary: true, backgroundColor: '#4285F4' },
            { id: 'work-id', summary: 'Work Meetings', primary: false, backgroundColor: '#0B8043' },
            { id: 'shared-id', summaryOverride: 'Team Projects', primary: false, backgroundColor: '#8E24AA' }
          ]
        })
      };
    };

    try {
      const list = await GoogleCalendarApi.getCalendarList('token_123');
      assert.strictEqual(list.length, 3);
      assert.strictEqual(list[0].id, 'primary-id');
      assert.strictEqual(list[0].summary, 'Personal');
      assert.strictEqual(list[0].primary, true);
      assert.strictEqual(list[0].backgroundColor, '#4285F4');

      assert.strictEqual(list[1].summary, 'Work Meetings');
      assert.strictEqual(list[1].primary, false);

      assert.strictEqual(list[2].summary, 'Team Projects');
      assert.strictEqual(list[2].backgroundColor, '#8E24AA');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('normalizeEvent extracts meetLink, dates, and color mapping', () => {
    const calendar = { id: 'cal-1', summary: 'Work', backgroundColor: '#33B679' };

    // Timed event with conferenceData Google Meet
    const item1 = {
      id: 'event-1',
      summary: 'Project Review',
      start: { dateTime: '2026-10-27T10:00:00Z' },
      end: { dateTime: '2026-10-27T11:00:00Z' },
      conferenceData: {
        entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/abc-defg-hij' }]
      },
      colorId: '11' // Tomato: #D50000
    };

    const norm1 = GoogleCalendarApi.normalizeEvent(item1, calendar);
    assert.strictEqual(norm1.id, 'event-1');
    assert.strictEqual(norm1.summary, 'Project Review');
    assert.strictEqual(norm1.isAllDay, false);
    assert.strictEqual(norm1.meetLink, 'https://meet.google.com/abc-defg-hij');
    assert.strictEqual(norm1.color, '#D50000');
    assert.strictEqual(norm1.calendarName, 'Work');

    // All-day event with fallback calendar background color
    const item2 = {
      id: 'event-2',
      summary: 'Company Offsite',
      start: { date: '2026-10-28' },
      end: { date: '2026-10-29' },
      hangoutLink: 'https://hangouts.google.com/call/123'
    };

    const norm2 = GoogleCalendarApi.normalizeEvent(item2, calendar);
    assert.strictEqual(norm2.isAllDay, true);
    assert.strictEqual(norm2.meetLink, 'https://hangouts.google.com/call/123');
    assert.strictEqual(norm2.color, '#33B679'); // inherited from calendar
  });

  await t.test('fetchMonthEvents queries all active calendars and skips deselected', async () => {
    const originalFetch = global.fetch;
    const queriedCalendarIds = [];

    global.fetch = async (url) => {
      const match = url.match(/calendars\/([^/]+)\/events/);
      if (match) queriedCalendarIds.push(decodeURIComponent(match[1]));
      return {
        ok: true,
        json: async () => ({
          items: [{
            id: 'evt-' + match[1],
            summary: 'Event in ' + match[1],
            start: { dateTime: '2026-10-27T12:00:00Z' },
            end: { dateTime: '2026-10-27T13:00:00Z' }
          }]
        })
      };
    };

    try {
      const calendars = [
        { id: 'cal-active-1', summary: 'Main', selected: true },
        { id: 'cal-unselected', summary: 'Ignored', selected: false },
        { id: 'cal-active-2', summary: 'Secondary', selected: true }
      ];

      const events = await GoogleCalendarApi.fetchMonthEvents('test-token', calendars, 2026, 9, false);
      assert.strictEqual(events.length, 2);
      assert.deepStrictEqual(queriedCalendarIds, ['cal-active-1', 'cal-active-2']);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test('fetchMonthEvents wide window for quad view covers extended months', async () => {
    const originalFetch = global.fetch;
    let capturedTimeMin = null;
    let capturedTimeMax = null;

    global.fetch = async (url) => {
      const u = new URL(url);
      capturedTimeMin = u.searchParams.get('timeMin');
      capturedTimeMax = u.searchParams.get('timeMax');
      return {
        ok: true,
        json: async () => ({ items: [] })
      };
    };

    try {
      const calendars = [{ id: 'test-cal', summary: 'Cal', selected: true }];
      await GoogleCalendarApi.fetchMonthEvents('token', calendars, 2026, 9, true); // Oct 2026, isQuad=true
      assert.ok(capturedTimeMin, 'timeMin must be specified');
      assert.ok(capturedTimeMax, 'timeMax must be specified');

      const minDate = new Date(capturedTimeMin);
      const maxDate = new Date(capturedTimeMax);

      // In quad view, window should reach back 2 months (August) and forward 3 months (December/January)
      assert.ok(minDate.getMonth() <= 7, 'Window starts in August or earlier');
      assert.ok(maxDate.getMonth() >= 11 || maxDate.getFullYear() > 2026, 'Window reaches at least December');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
