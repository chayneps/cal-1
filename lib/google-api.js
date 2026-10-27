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

  PERMANENT_EXTENSION_ID: 'pjbhfacacgemjghbkohafpckmkdpojmc',
  PERMANENT_REDIRECT_URI: 'https://pjbhfacacgemjghbkohafpckmkdpojmc.chromiumapp.org/',
  DEFAULT_CLIENT_ID: '159345734386-vqiad77b5amviiv2ve4j8s32dqi74fi8.apps.googleusercontent.com',

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

    if (optionsOrClientId && typeof optionsOrClientId === 'object') {
      clientId = optionsOrClientId.clientId;
      if (optionsOrClientId.interactive !== undefined) {
        isInteractive = !!optionsOrClientId.interactive;
      }
    } else if (typeof optionsOrClientId === 'string') {
      clientId = optionsOrClientId;
    }

    const manifest = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
      ? chrome.runtime.getManifest()
      : null;

    const manifestClientId = (typeof manifest?.oauth2?.client_id === 'string') ? manifest.oauth2.client_id.trim() : '';

    const stored = await Storage.get(['customClientId']);
    const storedId = (typeof stored?.customClientId === 'string') ? stored.customClientId : '';

    // Active client ID precedence: explicit custom ID > stored custom ID > manifest ID > default built-in ID
    const explicitId = typeof clientId === 'string' ? clientId.trim() : '';
    const activeClientId = explicitId || storedId || manifestClientId || this.DEFAULT_CLIENT_ID;

    // 1. If native Chrome Identity is available and no conflicting custom ID is provided, try getAuthToken first
    if (manifestClientId && (!storedId || storedId === manifestClientId) && (!explicitId || explicitId === manifestClientId)) {
      try {
        return await this.authenticateViaGetAuthToken(isInteractive);
      } catch (err) {
        console.warn('Native getAuthToken failed, falling back to launchWebAuthFlow:', err.message);
        if (activeClientId && !activeClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
          return await this.authenticateViaWebAuthFlow(activeClientId, isInteractive);
        }
        throw err;
      }
    }

    // 2. Otherwise use launchWebAuthFlow with active client ID
    if (activeClientId && !activeClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      return await this.authenticateViaWebAuthFlow(activeClientId, isInteractive);
    }

    // 3. Neither client ID configured yet
    const err = new Error('CLIENT_ID_REQUIRED');
    err.code = 'CLIENT_ID_REQUIRED';
    err.details = 'A Google OAuth Client ID is required to sign in with Google.';
    throw err;
  },

  /**
   * Authenticate via chrome.identity.launchWebAuthFlow (OAuth 2.0 Implicit Flow).
   * Works with Google Cloud "Web application" credentials.
   */
  async authenticateViaWebAuthFlow(clientId, interactive = true) {
    if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.launchWebAuthFlow) {
      throw new Error('Chrome Identity API is not available.');
    }

    const redirectUri = this.getRedirectUri();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('prompt', 'consent');

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
              err.diagnostic = `Redirect URI mismatch. In Google Cloud Console, add this exact Authorized Redirect URI: ${redirectUri}`;
            } else if (rawMsg.includes('canceled') || rawMsg.includes('closed')) {
              err.diagnostic = 'Google sign-in window was closed before completing.';
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

            resolve({
              token,
              userEmail: userProfile?.email || 'Connected Google Account',
              userName: userProfile?.name || '',
              expiresIn: params.get('expires_in')
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
          const err = new Error(rawMsg);
          err.diagnostic = rawMsg;
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

  /**
   * Fetch all user calendars (Primary, Work, Holidays, etc.)
   */
  async getCalendarList(token) {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('AUTH_EXPIRED');
      }
      throw new Error(`Failed to load calendars: ${res.statusText}`);
    }

    const data = await res.json();
    return (data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summaryOverride || cal.summary || 'Untitled Calendar',
      backgroundColor: cal.backgroundColor || '#4285F4',
      primary: !!cal.primary,
      selected: cal.selected !== false
    }));
  },

  /**
   * Fetch events for a given calendar within a time range.
   */
  async getEventsForCalendar(token, calendar, timeMin, timeMax) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
    url.searchParams.set('timeMin', timeMin.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('AUTH_EXPIRED');
      console.warn(`Could not load events for calendar ${calendar.summary}:`, res.statusText);
      return [];
    }

    const data = await res.json();
    return (data.items || []).map(item => this.normalizeEvent(item, calendar));
  },

  /**
   * Fetch events across all active calendars for the month view window.
   */
  async fetchMonthEvents(token, calendars, viewYear, viewMonth, isQuad = false) {
    const startWindow = isQuad
      ? new Date(viewYear, viewMonth - 2, 20, 0, 0, 0)
      : new Date(viewYear, viewMonth - 1, 20, 0, 0, 0);
    const endWindow = isQuad
      ? new Date(viewYear, viewMonth + 3, 15, 23, 59, 59)
      : new Date(viewYear, viewMonth + 1, 15, 23, 59, 59);

    const activeCalendars = (calendars || []).filter(c => c.selected !== false);
    const promises = activeCalendars.map(cal => 
      this.getEventsForCalendar(token, cal, startWindow, endWindow)
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
