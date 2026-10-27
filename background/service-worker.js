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

// Listen for messages from popup (e.g. interval changed or manual sync trigger)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'UPDATE_SYNC_INTERVAL') {
    setupSyncAlarm(request.interval).then(() => sendResponse({ success: true }));
    return true; // keep channel open for async response
  }
  if (request.action === 'TRIGGER_SYNC_NOW') {
    performBackgroundSync().then((result) => sendResponse(result));
    return true;
  }
});

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
        lastSyncTimestamp: nowTimestamp
      });
      console.log(`[DarkCal] Google REST API auto-sync complete: ${events.length} events updated at ${new Date(nowTimestamp).toLocaleTimeString()}`);
      return { success: true, count: events.length, timestamp: nowTimestamp, source: 'google-rest-api' };
    } catch (err) {
      console.warn('[DarkCal] Google REST API auto-sync background error:', err.message);
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
