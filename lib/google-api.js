// lib/google-api.js - Google Calendar REST API v3 Client with WebAuthFlow & Native Identity
import { Storage } from './storage.js';

export const GoogleCalendarApi = {
  // Default Google Calendar color mapping
  COLORS: {
    '1': '#7986CB', // Lavender
    '2': '#33B679', // Sage
    '3': '#8E24AA', // Grape
    '4': '#E67C73', // Flamingo
    '5': '#F6BF26', // Banana
    '6': '#F4511E', // Tangerine
    '7': '#039BE5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3F51B5', // Blueberry
    '10': '#0B8043', // Basil
    '11': '#D50000' // Tomato
  },

  PERMANENT_EXTENSION_ID: 'maoapoiknikleeemfoidiejmnfmclamb',
  PERMANENT_REDIRECT_URI: 'https://maoapoiknikleeemfoidiejmnfmclamb.chromiumapp.org/',
  DEFAULT_CLIENT_ID: '159345734386-1062jkjgsq6essm373r86s2csnijqq11.apps.googleusercontent.com',
  LEGACY_CHROME_EXT_CLIENT_ID: '159345734386-vqiad77b5amviiv2ve4j8s32dqi74fi8.apps.googleusercontent.com',

  /**
   * Get the extension's OAuth redirect URI.
   * Format: https://<extension-id>.chromiumapp.org/
   */
  getRedirectUri() {
    if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getRedirectURL) {
      return chrome.identity.getRedirectURL();
    }
    return this.PERMANENT_REDIRECT_URI;
  },

  /**
   * Get current Extension ID.
   */
  getExtensionId() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return chrome.runtime.id;
    }
    return this.PERMANENT_EXTENSION_ID;
  },

  /**
   * Primary authentication method.
   * Supports:
   * 1. getAuthToken (native 1-click Chrome Identity, using manifest.json oauth2)
   * 2. launchWebAuthFlow (using custom client ID or fallback)
   * Accepts: { clientId, interactive } options object or direct (clientId, interactive) args.
   */
  async authenticate(optionsOrClientId = null, interactive = true) {
    let clientId = null;
    let isInteractive = interactive;
    let loginHint = null;

    if (optionsOrClientId && typeof optionsOrClientId === 'object') {
      clientId = optionsOrClientId.clientId;
      if (optionsOrClientId.interactive !== undefined) {
        isInteractive = !!optionsOrClientId.interactive;
      }
      if (optionsOrClientId.loginHint) {
        loginHint = optionsOrClientId.loginHint;
      }
    } else if (typeof optionsOrClientId === 'string') {
      clientId = optionsOrClientId;
    }

    let explicitId = typeof clientId === 'string' ? clientId.trim() : '';
    if (explicitId === this.LEGACY_CHROME_EXT_CLIENT_ID) {
      explicitId = '';
    }
    const stored = await Storage.get(['customClientId', 'googleUserEmail']);
    let storedId = (typeof stored?.customClientId === 'string') ? stored.customClientId.trim() : '';
    if (storedId === this.LEGACY_CHROME_EXT_CLIENT_ID) {
      storedId = '';
      await Storage.set({ customClientId: '' });
    }
    const activeClientId = explicitId || storedId || this.DEFAULT_CLIENT_ID;
    const effectiveLoginHint = loginHint || stored?.googleUserEmail || '';

    // Use launchWebAuthFlow with OAuth 2.0 Implicit Flow (response_type=token).
    // Note: chrome.identity.getAuthToken triggers "Error 400: unsupported_response_type (GeneralOAuthFlow)"
    // on Google's consent screen for Chrome Extension OAuth clients. launchWebAuthFlow with a
    // "Web application" OAuth Client ID and https://<extension-id>.chromiumapp.org/ redirect URI avoids this.
    if (activeClientId && !activeClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      return await this.authenticateViaWebAuthFlow(activeClientId, isInteractive, effectiveLoginHint);
    }

    // Neither client ID configured yet
    const err = new Error('CLIENT_ID_REQUIRED');
    err.code = 'CLIENT_ID_REQUIRED';
    err.details = 'A Google OAuth Client ID is required to sign in with Google.';
    throw err;
  },

  /**
   * Authenticate via chrome.identity.launchWebAuthFlow (OAuth 2.0 Implicit Flow).
   * Works with Google Cloud "Web application" credentials.
   */
  async authenticateViaWebAuthFlow(clientId, interactive = true, loginHint = '') {
    if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.launchWebAuthFlow) {
      throw new Error('Chrome Identity API is not available.');
    }

    const redirectUri = this.getRedirectUri();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/tasks.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', interactive ? 'select_account' : 'none');
    if (loginHint && loginHint.includes('@') && loginHint !== 'Google User' && loginHint !== 'Connected Google Account') {
      authUrl.searchParams.set('login_hint', loginHint);
    }

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            const rawMsg = chrome.runtime.lastError.message || '';
            const err = new Error(rawMsg);
            if (rawMsg.includes('Authorization page could not be loaded') || rawMsg.includes('redirect_uri_mismatch')) {
              err.diagnostic = `Redirect URI mismatch: Create a "Web application" OAuth Client ID in Google Cloud Console with Authorized Redirect URI: ${redirectUri}`;
            } else if (rawMsg.includes('canceled') || rawMsg.includes('closed') || rawMsg.includes('did not approve')) {
              err.diagnostic = 'Google sign-in window was closed before completing. Make sure your OAuth Client ID is type "Web application" with Redirect URI: ' + redirectUri;
            } else {
              err.diagnostic = rawMsg;
            }
            return reject(err);
          }

          if (!redirectUrl) {
            return reject(new Error('No redirect URL returned from Google sign-in.'));
          }

          try {
            // Google returns token in the URL hash fragment (#access_token=...&expires_in=...)
            const parsedUrl = new URL(redirectUrl);
            const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.substring(1) : parsedUrl.hash;
            const params = new URLSearchParams(hash);

            const token = params.get('access_token');
            const error = params.get('error') || parsedUrl.searchParams.get('error');

            if (error) {
              const err = new Error(`Google OAuth error: ${error}`);
              if (error === 'redirect_uri_mismatch') {
                err.diagnostic = `Redirect URI mismatch. Make sure you added "${redirectUri}" under Authorized redirect URIs in Google Cloud Console.`;
              } else if (error === 'invalid_client') {
                err.diagnostic = 'Invalid Client ID. Please verify your Google Cloud Client ID.';
              } else {
                err.diagnostic = error;
              }
              return reject(err);
            }

            if (!token) {
              return reject(new Error('No access token found in Google response.'));
            }

            // Fetch user profile to verify token and get email
            const userProfile = await this.getUserProfile(token).catch(() => null);
            const expiresInSec = parseInt(params.get('expires_in') || '3600', 10);
            const tokenExpiresAt = Date.now() + (expiresInSec * 1000) - 60000;

            resolve({
              token,
              userEmail: userProfile?.email || loginHint || 'Connected Google Account',
              userName: userProfile?.name || '',
              expiresIn: expiresInSec,
              tokenExpiresAt
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  },

  /**
   * Authenticate via native chrome.identity.getAuthToken (for Chrome extension client IDs).
   */
  async authenticateViaGetAuthToken(interactive = true) {
    if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
      throw new Error('Chrome Identity API is not available.');
    }

    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, async (token) => {
        if (chrome.runtime.lastError) {
          const rawMsg = chrome.runtime.lastError.message || '';
          console.error('[DarkCal] chrome.identity.getAuthToken error:', rawMsg);
          let userMsg = rawMsg;
          if (rawMsg.includes('did not approve access') || rawMsg.includes('access_denied')) {
            userMsg = 'Access was not approved. In Google Cloud Console > "OAuth consent screen", please make sure your Google email is added under "Test users".';
          } else if (rawMsg.includes('OAuth2 request failed') && rawMsg.includes('restricted_client')) {
            userMsg = 'Access restricted: Please add your email to "Test users" in Google Cloud Console > OAuth consent screen.';
          } else if (rawMsg.includes('bad client id')) {
            userMsg = 'Extension ID mismatch: please reload the extension in chrome://extensions.';
          } else if (rawMsg.includes('The user is not signed in to Chrome')) {
            userMsg = 'Please sign in to your Google Account in your Chrome browser profile.';
          }
          const err = new Error(userMsg);
          err.raw = rawMsg;
          return reject(err);
        }
        if (!token) {
          return reject(new Error('No token returned from Google.'));
        }

        const userProfile = await this.getUserProfile(token).catch(() => null);

        resolve({
          token,
          userEmail: userProfile?.email || 'Connected Google Account',
          userName: userProfile?.name || ''
        });
      });
    });
  },

  /**
   * Retrieve Google user profile for display.
   */
  async getUserProfile(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  },

  /**
   * Remove cached auth token to log out or refresh.
   */
  async clearAuthToken(token) {
    if (typeof chrome !== 'undefined' && chrome.identity) {
      if (token && chrome.identity.removeCachedAuthToken) {
        await new Promise((res) => {
          chrome.identity.removeCachedAuthToken({ token }, res);
        });
      }
      if (token) {
        try {
          await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        } catch (e) {
          console.warn('Revoke token warning:', e);
        }
      }
    }
    await Storage.remove(['googleAuthToken', 'googleUserEmail', 'cachedCalendars', 'cachedEvents']);
  },

  /**
   * Revoke auth token and clear credentials.
   */
  async revokeToken(token) {
    return await this.clearAuthToken(token);
  },

  _refreshPromise: null,

  /**
   * Silently refresh the Google OAuth access token using launchWebAuthFlow(interactive: false).
   * Deduplicates concurrent refresh attempts so multiple parallel requests share a single refresh.
   */
  async refreshAuthToken() {
    if (this._refreshPromise) {
      return await this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        const stored = await Storage.get(['googleUserEmail', 'customClientId']);
        const authResult = await this.authenticate({
          clientId: stored?.customClientId || this.DEFAULT_CLIENT_ID,
          interactive: false,
          loginHint: stored?.googleUserEmail
        });

        const token = typeof authResult === 'string' ? authResult : authResult?.token;
        if (!token) {
          throw new Error('AUTH_EXPIRED');
        }

        const expiresIn = authResult?.expiresIn ? parseInt(authResult.expiresIn, 10) : 3600;
        const tokenExpiresAt = authResult?.tokenExpiresAt || (Date.now() + (expiresIn * 1000) - 60000);
        const toSave = {
          googleAuthToken: token,
          tokenExpiresAt,
          googleSyncError: ''
        };
        if (authResult?.userEmail && authResult.userEmail !== 'Connected Google Account') {
          toSave.googleUserEmail = authResult.userEmail;
        }
        if (authResult?.userName) {
          toSave.googleUserName = authResult.userName;
        }
        await Storage.set(toSave);

        return {
          token,
          tokenExpiresAt,
          userEmail: authResult?.userEmail,
          userName: authResult?.userName
        };
      } catch (err) {
        console.warn('[GoogleCalendarApi] Silent token refresh failed:', err.message);
        throw new Error('AUTH_EXPIRED');
      } finally {
        this._refreshPromise = null;
      }
    })();

    return await this._refreshPromise;
  },

  /**
   * Fetch all user calendars (Primary, Work, Holidays, etc.)
   */
  async getCalendarList(token, { includeTasks = false } = {}) {
    let activeToken = token;
    let res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=true', {
      headers: {
        Authorization: `Bearer ${activeToken}`
      }
    });

    if (res.status === 401) {
      try {
        const refreshed = await this.refreshAuthToken();
        if (refreshed?.token) {
          activeToken = refreshed.token;
          res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=true', {
            headers: {
              Authorization: `Bearer ${activeToken}`
            }
          });
        }
      } catch (_) {
        throw new Error('AUTH_EXPIRED');
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('AUTH_EXPIRED');
      }
      let detail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          detail = errJson.error.message;
        }
      } catch (_) {}
      throw new Error(`Failed to load calendars (${res.status}): ${detail}`);
    }

    const data = await res.json();
    const list = (data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summaryOverride || cal.summary || 'Untitled Calendar',
      backgroundColor: cal.backgroundColor || '#4285F4',
      primary: !!cal.primary,
      accessRole: cal.accessRole || (cal.primary ? 'owner' : 'reader'),
      selected: cal.selected !== false
    }));

    if (list.length === 0) {
      const defaultPrimary = [{
        id: 'primary',
        summary: 'Primary',
        backgroundColor: '#4285F4',
        primary: true,
        accessRole: 'owner',
        selected: true
      }];
      if (!includeTasks) {
        return defaultPrimary;
      }
      return this.ensureSystemCalendars(defaultPrimary);
    }

    if (includeTasks) {
      return this.ensureSystemCalendars(list);
    }

    return list;
  },

  /**
   * Guarantees Birthdays and Tasks are included in the calendar list
   */
  ensureSystemCalendars(list = []) {
    const res = [...list];

    // Ensure Birthdays exists
    const hasBirthdays = res.some(c =>
      (c.summary && c.summary.toLowerCase() === 'birthdays') ||
      (c.id && c.id.includes('contacts@group.v.calendar.google.com'))
    );
    if (!hasBirthdays) {
      res.push({
        id: 'addressbook#contacts@group.v.calendar.google.com',
        summary: 'Birthdays',
        backgroundColor: '#9a9cff',
        primary: false,
        accessRole: 'reader',
        selected: false
      });
    }

    // Ensure Tasks exists
    const hasTasks = res.some(c =>
      (c.id && c.id.toLowerCase() === 'tasks') ||
      (c.summary && c.summary.toLowerCase() === 'tasks')
    );
    if (!hasTasks) {
      res.push({
        id: 'tasks',
        summary: 'Tasks',
        backgroundColor: '#039be5',
        primary: false,
        accessRole: 'owner',
        selected: true
      });
    }

    return res;
  },

  /**
   * Fetch events for a given calendar within a time range.
   */
  async getEventsForCalendar(token, calendar, timeMin, timeMax) {
    if (calendar.id === 'tasks' || calendar.id === 'google-tasks') {
      return await this.getTasksForWindow(token, calendar, timeMin, timeMax);
    }

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
    url.searchParams.set('timeMin', timeMin.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    let activeToken = token;
    let res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${activeToken}`
      }
    });

    if (res.status === 401) {
      try {
        const refreshed = await this.refreshAuthToken();
        if (refreshed?.token) {
          activeToken = refreshed.token;
          res = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${activeToken}`
            }
          });
        }
      } catch (_) {
        throw new Error('AUTH_EXPIRED');
      }
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('AUTH_EXPIRED');

      // Fallback for birthdays: if addressbook calendar returns 404, query eventTypes=birthday on primary
      if (res.status === 404 && (calendar.id.includes('contacts@group.v.calendar.google.com') || calendar.id === 'birthdays')) {
        try {
          const bdayUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
          bdayUrl.searchParams.set('timeMin', timeMin.toISOString());
          bdayUrl.searchParams.set('timeMax', timeMax.toISOString());
          bdayUrl.searchParams.set('singleEvents', 'true');
          bdayUrl.searchParams.set('eventTypes', 'birthday');
          bdayUrl.searchParams.set('maxResults', '250');
          const bdayRes = await fetch(bdayUrl.toString(), {
            headers: { Authorization: `Bearer ${activeToken}` }
          });
          if (bdayRes.ok) {
            const bdayData = await bdayRes.json();
            return (bdayData.items || []).map(item => this.normalizeEvent(item, calendar));
          }
        } catch (_) {}
      }

      let detail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          detail = errJson.error.message;
        }
      } catch (_) {}
      console.warn(`Could not load events for calendar ${calendar.summary} (${res.status}):`, detail);
      if (res.status === 403 && detail.includes('Google Calendar API has not been used')) {
        throw new Error('Google Calendar API is not enabled in your Google Cloud project. Enable it in Google Cloud Console > APIs & Services > Library > Google Calendar API.');
      }
      return [];
    }

    const data = await res.json();
    return (data.items || []).map(item => this.normalizeEvent(item, calendar));
  },

  /**
   * Fetch Google Tasks with due dates for the specified window
   */
  async getTasksForWindow(token, calendar, timeMin, timeMax) {
    let activeToken = token;
    try {
      const taskUrl = new URL('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks');
      taskUrl.searchParams.set('dueMin', timeMin.toISOString());
      taskUrl.searchParams.set('dueMax', timeMax.toISOString());
      taskUrl.searchParams.set('showCompleted', 'true');
      taskUrl.searchParams.set('maxResults', '100');

      let res = await fetch(taskUrl.toString(), {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });

      if (res.status === 401) {
        try {
          const refreshed = await this.refreshAuthToken();
          if (refreshed?.token) {
            activeToken = refreshed.token;
            res = await fetch(taskUrl.toString(), {
              headers: { Authorization: `Bearer ${activeToken}` }
            });
          }
        } catch (_) {
          return [];
        }
      }

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return (data.items || []).filter(task => task.due).map(task => ({
        id: `task-${task.id}`,
        summary: task.title || 'Untitled Task',
        description: task.notes || '',
        location: '',
        start: { date: task.due.substring(0, 10), dateTime: task.due },
        end: { date: task.due.substring(0, 10), dateTime: task.due },
        isAllDay: true,
        calendarId: 'tasks',
        calendarName: 'Tasks',
        calendarColor: calendar.backgroundColor || '#039be5',
        isCompleted: task.status === 'completed'
      }));
    } catch (_) {
      return [];
    }
  },

  /**
   * Fetch events across all active calendars for the month view window.
   */
  async fetchMonthEvents(token, calendars, viewYear, viewMonth, isQuad = false) {
    let activeToken = token;
    const stored = await Storage.get(['tokenExpiresAt']);
    if (stored?.tokenExpiresAt && Date.now() >= stored.tokenExpiresAt) {
      try {
        const refreshed = await this.refreshAuthToken();
        if (refreshed?.token) {
          activeToken = refreshed.token;
        }
      } catch (_) {
        // Fall back to attempting with existing activeToken
      }
    }

    const startWindow = isQuad
      ? new Date(viewYear, viewMonth - 2, 20, 0, 0, 0)
      : new Date(viewYear, viewMonth - 1, 20, 0, 0, 0);
    const endWindow = isQuad
      ? new Date(viewYear, viewMonth + 3, 15, 23, 59, 59)
      : new Date(viewYear, viewMonth + 1, 15, 23, 59, 59);

    const calList = (calendars && calendars.length > 0)
      ? calendars
      : [{ id: 'primary', summary: 'Primary', backgroundColor: '#4285F4', primary: true, selected: true }];
    const activeCalendars = calList.filter(c => c.selected !== false);
    const promises = activeCalendars.map(cal => 
      this.getEventsForCalendar(activeToken, cal, startWindow, endWindow)
    );

    const results = await Promise.all(promises);
    return results.flat();
  },

  /**
   * Normalizes a Google Calendar API event into a standard structure.
   */
  normalizeEvent(item, calendar) {
    const isAllDay = !!(item.start && item.start.date && !item.start.dateTime);
    
    // Check for Google Meet or conference links
    let meetLink = null;
    if (item.conferenceData && item.conferenceData.entryPoints) {
      const videoEntry = item.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
      if (videoEntry) meetLink = videoEntry.uri;
    } else if (item.hangoutLink) {
      meetLink = item.hangoutLink;
    } else if (item.location && (item.location.includes('meet.google.com') || item.location.includes('zoom.us') || item.location.includes('teams.microsoft.com'))) {
      meetLink = item.location;
    }

    const eventColor = item.colorId && this.COLORS[item.colorId] 
      ? this.COLORS[item.colorId] 
      : (calendar.backgroundColor || '#4285F4');

    return {
      id: item.id,
      calendarId: calendar.id,
      calendarName: calendar.summary,
      color: eventColor,
      summary: item.summary || '(No title)',
      description: item.description || '',
      location: item.location || '',
      meetLink,
      htmlLink: item.htmlLink || 'https://calendar.google.com',
      isAllDay,
      start: item.start,
      end: item.end,
      status: item.status
    };
  }
};
