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

  await t.test('authenticate throws CLIENT_ID_REQUIRED if no clientId is configured anywhere', async () => {
    const originalDefault = GoogleCalendarApi.DEFAULT_CLIENT_ID;
    GoogleCalendarApi.DEFAULT_CLIENT_ID = '';
    try {
      // 1. Called with no arguments and no default
      await assert.rejects(
        async () => {
          await GoogleCalendarApi.authenticate();
        },
        (err) => err.message === 'CLIENT_ID_REQUIRED' && err.code === 'CLIENT_ID_REQUIRED'
      );

      // 2. Called with object containing empty clientId and no default
      await assert.rejects(
        async () => {
          await GoogleCalendarApi.authenticate({ clientId: '   ', interactive: true });
        },
        (err) => err.message === 'CLIENT_ID_REQUIRED' && err.code === 'CLIENT_ID_REQUIRED'
      );
    } finally {
      GoogleCalendarApi.DEFAULT_CLIENT_ID = originalDefault;
    }
  });

  await t.test('authenticate automatically uses DEFAULT_CLIENT_ID when no custom ID is provided', async () => {
    const res = await GoogleCalendarApi.authenticate();
    assert.ok(res.token, 'Should successfully authenticate with default client ID');
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

  await t.test('getCalendarList with includeTasks guarantees Birthdays and Tasks are included', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      assert.ok(url.includes('showHidden=true'), 'Should request showHidden=true for Birthdays');
      return {
        ok: true,
        json: async () => ({
          items: [
            { id: 'primary-id', summary: 'Personal', primary: true, accessRole: 'owner', backgroundColor: '#4285F4' },
            { id: 'holidays-id', summary: 'Holidays in Canada', primary: false, accessRole: 'reader', backgroundColor: '#0B8043' }
          ]
        })
      };
    };

    try {
      const list = await GoogleCalendarApi.getCalendarList('token_123', { includeTasks: true });
      assert.strictEqual(list.length, 4, 'Should contain Personal, Holidays, Birthdays, and Tasks');

      const birthdays = list.find(c => c.summary === 'Birthdays');
      assert.ok(birthdays, 'Birthdays calendar should be present');
      assert.strictEqual(birthdays.accessRole, 'reader');
      assert.strictEqual(birthdays.selected, false);

      const tasks = list.find(c => c.summary === 'Tasks');
      assert.ok(tasks, 'Tasks calendar should be present');
      assert.strictEqual(tasks.accessRole, 'owner');
      assert.strictEqual(tasks.selected, true);
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

  await t.test('refreshAuthToken runs silent WebAuthFlow with prompt=none and login_hint', async () => {
    let capturedOpts = null;
    const originalLaunch = global.chrome.identity.launchWebAuthFlow;
    global.chrome.identity.launchWebAuthFlow = (opts, cb) => {
      capturedOpts = opts;
      cb('https://mock-extension-id.chromiumapp.org/#access_token=refreshed_token_xyz&expires_in=3600');
    };

    try {
      const res = await GoogleCalendarApi.refreshAuthToken();
      assert.strictEqual(res.token, 'refreshed_token_xyz');
      assert.ok(capturedOpts, 'launchWebAuthFlow should have been called');
      assert.strictEqual(capturedOpts.interactive, false, 'Must be non-interactive');

      const u = new URL(capturedOpts.url);
      assert.strictEqual(u.searchParams.get('prompt'), 'none', 'Must pass prompt=none for silent refresh');
      assert.strictEqual(u.searchParams.get('response_type'), 'token');
    } finally {
      global.chrome.identity.launchWebAuthFlow = originalLaunch;
    }
  });

  await t.test('getCalendarList automatically retries on 401 using refreshed token', async () => {
    let calendarListAttempts = 0;
    const originalFetch = global.fetch;
    const originalLaunch = global.chrome.identity.launchWebAuthFlow;

    global.chrome.identity.launchWebAuthFlow = (opts, cb) => {
      cb('https://mock-extension-id.chromiumapp.org/#access_token=auto_refreshed_token&expires_in=3600');
    };

    global.fetch = async (url, opts) => {
      if (url.includes('userinfo')) {
        return {
          ok: true,
          json: async () => ({ email: 'test@example.com', name: 'Test User' })
        };
      }
      calendarListAttempts++;
      if (calendarListAttempts === 1) {
        assert.strictEqual(opts.headers.Authorization, 'Bearer expired_token');
        return { ok: false, status: 401, statusText: 'Unauthorized' };
      }
      assert.strictEqual(opts.headers.Authorization, 'Bearer auto_refreshed_token');
      return {
        ok: true,
        json: async () => ({
          items: [{ id: 'primary', summary: 'Primary', primary: true }]
        })
      };
    };

    try {
      const list = await GoogleCalendarApi.getCalendarList('expired_token');
      assert.strictEqual(calendarListAttempts, 2, 'Should have retried with refreshed token');
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].id, 'primary');
    } finally {
      global.fetch = originalFetch;
      global.chrome.identity.launchWebAuthFlow = originalLaunch;
    }
  });

  await t.test('refreshAuthToken deduplicates concurrent calls into a single WebAuthFlow invocation', async () => {
    let launchCount = 0;
    const originalLaunch = global.chrome.identity.launchWebAuthFlow;
    global.chrome.identity.launchWebAuthFlow = (opts, cb) => {
      launchCount++;
      setTimeout(() => {
        cb('https://mock-extension-id.chromiumapp.org/#access_token=shared_token&expires_in=3600');
      }, 20);
    };

    try {
      const [r1, r2, r3] = await Promise.all([
        GoogleCalendarApi.refreshAuthToken(),
        GoogleCalendarApi.refreshAuthToken(),
        GoogleCalendarApi.refreshAuthToken()
      ]);

      assert.strictEqual(launchCount, 1, 'Only 1 launchWebAuthFlow call should be made for concurrent requests');
      assert.strictEqual(r1.token, 'shared_token');
      assert.strictEqual(r2.token, 'shared_token');
      assert.strictEqual(r3.token, 'shared_token');
    } finally {
      global.chrome.identity.launchWebAuthFlow = originalLaunch;
    }
  });
});
