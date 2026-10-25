// background/service-worker.js - Background Service Worker with Auto-Sync for DarkCal
import { parseICal } from '../lib/ical-parser.js';

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
 * Fetches the user's Google Calendar iCal feed in the background,
 * parses the events, and updates storage.
 */
export async function performBackgroundSync() {
  const { icalUrl, useDemoData } = await chrome.storage.local.get(['icalUrl', 'useDemoData']);
  if (!icalUrl || useDemoData) {
    return { success: false, reason: 'No iCal URL configured or in Demo Mode' };
  }

  try {
    console.log('[DarkCal] Auto-syncing calendar feed in background...');
    const res = await fetch(icalUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const icsText = await res.text();
    const parsedEvents = parseICal(icsText, 'Google Calendar', '#4285F4');

    if (parsedEvents.length > 0) {
      const now = Date.now();
      await chrome.storage.local.set({
        savedIcalEvents: parsedEvents,
        lastSyncTimestamp: now
      });
      console.log(`[DarkCal] Auto-sync complete: ${parsedEvents.length} events updated at ${new Date(now).toLocaleTimeString()}`);
      return { success: true, count: parsedEvents.length, timestamp: now };
    }
    return { success: false, reason: '0 events parsed' };
  } catch (err) {
    console.warn('[DarkCal] Auto-sync background error:', err.message);
    return { success: false, error: err.message };
  }
}
