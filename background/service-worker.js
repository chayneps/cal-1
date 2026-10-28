// background/service-worker.js - Background Service Worker with Auto-Sync for DarkCal
import { parseICal } from '../lib/ical-parser.js';
import { GoogleCalendarApi } from '../lib/google-api.js';

const ALARM_NAME = 'darkcal-auto-sync';

// Initialize default settings and auto-sync alarm
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[DarkCal] Installed/Updated reason:', details.reason);

  const defaults = {
    useDemoData: true,
    firstDayOfWeek: 0, // 0 = Sunday, 1 = Monday
    autoSyncInterval: 15, // in minutes (15, 30, 60, 120, 0 = manual)
    icalUrl: '',
    savedIcalEvents: [],
    lastSyncTimestamp: null
  };

  const stored = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  for (const [key, val] of Object.entries(defaults)) {
    if (stored[key] === undefined) {
      toSet[key] = val;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }

  const interval = stored.autoSyncInterval || 15;
  await setupSyncAlarm(interval);
});

// Re-register alarm on browser startup if missing
chrome.runtime.onStartup.addListener(async () => {
  const { autoSyncInterval } = await chrome.storage.local.get(['autoSyncInterval']);
  await setupSyncAlarm(autoSyncInterval || 15);
});

// Configure periodic background sync alarm
async function setupSyncAlarm(periodInMinutes = 15) {
  await chrome.alarms.clear(ALARM_NAME);
  if (periodInMinutes && periodInMinutes > 0) {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: Math.max(1, periodInMinutes)
    });
    console.log(`[DarkCal] Auto-sync alarm configured for every ${periodInMinutes} minutes.`);
  } else {
    console.log('[DarkCal] Auto-sync disabled (Manual sync only).');
  }
}

// Alarm listener: triggers background auto-sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await performBackgroundSync();
  }
});

// Listen for messages from popup (e.g. interval changed, manual sync trigger, or Google OAuth sign-in)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'UPDATE_SYNC_INTERVAL') {
    setupSyncAlarm(request.interval).then(() => sendResponse({ success: true }));
    return true; // keep channel open for async response
  }
  if (request.action === 'TRIGGER_SYNC_NOW') {
    performBackgroundSync().then((result) => sendResponse(result));
    return true;
  }
  if (request.action === 'GOOGLE_SIGN_IN') {
    handleBackgroundGoogleSignIn(request.clientId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({
        success: false,
        error: err.message || 'Google Sign-In failed',
        code: err.code || '',
        diagnostic: err.diagnostic || ''
      }));
    return true;
  }
  if (request.action === 'REFRESH_GOOGLE_TOKEN') {
    GoogleCalendarApi.refreshAuthToken()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * Runs Google OAuth WebAuthFlow in the background service worker so that when
 * the extension popup closes upon opening the Google login window, authentication
 * and initial calendar sync still complete and persist to chrome.storage.local.
 */
async function handleBackgroundGoogleSignIn(clientId) {
  const authResult = await GoogleCalendarApi.authenticate({
    clientId,
    interactive: true
  });

  const token = typeof authResult === 'string' ? authResult : authResult?.token;
  if (!token) {
    throw new Error('Authentication did not return an access token.');
  }

  let userEmail = authResult?.userEmail || '';
  let userName = authResult?.userName || '';

  if (!userEmail || userEmail === 'Connected Google Account') {
    try {
      const profile = await GoogleCalendarApi.getUserProfile(token);
      if (profile?.email) {
        userEmail = profile.email;
        userName = profile.name || '';
      }
    } catch (pErr) {
      console.warn('[DarkCal] Could not fetch user profile:', pErr);
    }
  }
  if (!userEmail) {
    userEmail = 'Google User';
  }

  let calendars = [];
  let syncError = '';
  try {
    calendars = await GoogleCalendarApi.getCalendarList(token, { includeTasks: true });
  } catch (cErr) {
    console.warn('[DarkCal] Could not fetch calendars list:', cErr);
    syncError = cErr.message || '';
    calendars = [{
      id: 'primary',
      summary: userEmail || 'Primary',
      backgroundColor: '#4285F4',
      primary: true,
      selected: true
    }];
  }

  const stored = await chrome.storage.local.get(['customCalendarName', 'calendarName', 'activeCalendarFilter']);
  const calendarName = stored.customCalendarName || stored.calendarName || 'all';

  let events = [];
  try {
    const now = new Date();
    events = await GoogleCalendarApi.fetchMonthEvents(
      token,
      calendars,
      now.getFullYear(),
      now.getMonth(),
      true
    );
  } catch (eErr) {
    console.warn('[DarkCal] Could not fetch initial Google events:', eErr);
    if (!syncError) syncError = eErr.message || '';
  }

  const nowTimestamp = Date.now();
  const expiresIn = authResult?.expiresIn ? parseInt(authResult.expiresIn, 10) : 3600;
  const tokenExpiresAt = authResult?.tokenExpiresAt || (nowTimestamp + (expiresIn * 1000) - 60000);

  await chrome.storage.local.set({
    googleAuthToken: token,
    tokenExpiresAt,
    googleUserEmail: userEmail,
    googleUserName: userName,
    googleCalendars: calendars,
    savedGoogleEvents: events,
    useDemoData: false,
    calendarName,
    activeCalendarFilter: stored.activeCalendarFilter || 'all',
    lastSyncTimestamp: nowTimestamp,
    googleSyncError: syncError
  });

  // Automatically re-open the extension popup if it closed while the OAuth window was focused
  if (typeof chrome !== 'undefined' && chrome.action && chrome.action.openPopup) {
    try {
      await chrome.action.openPopup();
    } catch (_) {
      // Ignore if popup is already open or no active browser window
    }
  }

  return {
    success: true,
    token,
    userEmail,
    userName,
    calendars,
    events,
    calendarName,
    lastSyncTimestamp: nowTimestamp,
    syncError
  };
}

/**
 * Fetches events in the background via Google Calendar REST API or iCal feed,
 * and updates storage.
 */
export async function performBackgroundSync() {
  const stored = await chrome.storage.local.get([
    'googleAuthToken',
    'googleCalendars',
    'icalUrl',
    'useDemoData',
    'customCalendarName'
  ]);

  if (stored.useDemoData) {
    return { success: false, reason: 'In Demo Mode' };
  }

  // Google Calendar REST API sync
  if (stored.googleAuthToken) {
    try {
      console.log('[DarkCal] Auto-syncing Google Calendar REST API in background...');
      const now = new Date();
      const events = await GoogleCalendarApi.fetchMonthEvents(
        stored.googleAuthToken,
        stored.googleCalendars || [],
        now.getFullYear(),
        now.getMonth(),
        true
      );
      const nowTimestamp = Date.now();
      await chrome.storage.local.set({
        savedGoogleEvents: events,
        lastSyncTimestamp: nowTimestamp,
        googleSyncError: ''
      });
      console.log(`[DarkCal] Google REST API auto-sync complete: ${events.length} events updated at ${new Date(nowTimestamp).toLocaleTimeString()}`);
      return { success: true, count: events.length, timestamp: nowTimestamp, source: 'google-rest-api' };
    } catch (err) {
      console.warn('[DarkCal] Google REST API auto-sync background error:', err.message);
      if (err.message === 'AUTH_EXPIRED') {
        await chrome.storage.local.set({ googleSyncError: 'AUTH_EXPIRED' });
      }
      return { success: false, error: err.message };
    }
  }

  // Fallback: iCal feed sync
  if (stored.icalUrl) {
    try {
      console.log('[DarkCal] Auto-syncing calendar feed in background...');
      const res = await fetch(stored.icalUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const icsText = await res.text();
      const parsedEvents = parseICal(icsText, 'Google Calendar', '#4285F4');

      if (parsedEvents.length > 0) {
        const now = Date.now();
        const detectedName = parsedEvents.calendarName || 'main';
        const finalName = stored.customCalendarName || detectedName;
        await chrome.storage.local.set({
          savedIcalEvents: parsedEvents,
          calendarName: finalName,
          detectedCalendarName: detectedName,
          lastSyncTimestamp: now
        });
        console.log(`[DarkCal] Auto-sync complete: ${parsedEvents.length} events from "${finalName}" updated at ${new Date(now).toLocaleTimeString()}`);
        return { success: true, count: parsedEvents.length, timestamp: now, calendarName: finalName, source: 'ical' };
      }
      return { success: false, reason: '0 events parsed' };
    } catch (err) {
      console.warn('[DarkCal] Auto-sync background error:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, reason: 'No Google account or iCal URL configured' };
}
