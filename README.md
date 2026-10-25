# cal(1) - Unix Command-Line Google Calendar for Chrome

**cal(1)** is a terminal-inspired dropdown calendar for Google Chrome inspired by the Unix [cal(1)](https://en.wikipedia.org/wiki/Cal_(command)) manual page and styled with [Spaceship Prompt](https://github.com/spaceship-prompt/spaceship-prompt) aesthetics, Homebrew iTerm2 ANSI colors, and the Hack monospace font.

---

## Interactive cal(1) Command Line

Type commands directly at the Spaceship prompt (`➜ cal ...`) to jump to any month or year:

* `cal 12 2026` or `cal dec 2026` &rarr; Jump to December 2026
* `cal 2027` &rarr; Jump to January 2027
* `cal 5` or `cal may` &rarr; Jump to May of the current year
* `cal` or `cal today` &rarr; Jump back to the current month / today
* `cal next` / `cal prev` &rarr; Advance or reverse 1 month
* `cal -3` &rarr; 3-month reference view
* `cal --help` &rarr; Show command usage tips
* **Keyboard Shortcut**: Press `/` or `:` anywhere to jump focus to the command input!

---

## Auto-Sync Features

**Yes, cal(1) automatically syncs your Google Calendar!**

1. **Background Periodic Auto-Sync**:
   - The background service worker uses `chrome.alarms` to automatically fetch and update your calendar events in the background (default: **every 15 minutes**).
   - Even if the dropdown is closed, cal(1) stays up to date.

2. **Smart Stale-Cache Auto-Refresh**:
   - When you click the extension icon, cal(1) renders your cached events instantly (0ms load time).
   - If your cache is older than the auto-sync threshold, it automatically triggers a silent background refresh and updates the calendar grid live.

3. **Customizable Sync Frequency**:
   - Open **Settings (gear icon)** &rarr; **Auto-Sync Schedule**:
     - Every 15 minutes (Default / Recommended)
     - Every 30 minutes
     - Every 1 hour
     - Every 2 hours
     - Manual only

4. **Live Sync Status Indicator**:
   - The footer displays the exact sync status (e.g. `Live Google Calendar (18 events) • Synced 3m ago`).
   - You can also click the **Sync icon** in the top bar to force a manual sync anytime.

---

## Key Features

- 💻 **iTerm2 Homebrew Terminal Theme**:
  - Pitch black background (`#000000`) with phosphor terminal green text (`#00ff00`), ANSI accents (cyan, yellow, red, magenta), and CRT subtle glow.
  - Switchable in Settings to **Obsidian Dark** if preferred.
- 🔤 **Hack Monospace Font**: Bundled official Hack typeface (`woff2`) for clean code and schedule alignment.
- 📅 **Month Grid View**: 7-day grid with weekday headers, current day glowing highlight, and event count pills.
- 🔍 **Top-to-Bottom Hover Day Schedule**:
  - Hover over any day cell to inspect the entire day's schedule chronologically from top to bottom (00:00 to 23:59).
  - Displays all-day events at top, followed by timed appointments with exact start/end times and durations.
  - Video call detection: 1-click **Join Video Call** button for Google Meet and Zoom links.
  - **Pin to Lock**: Click any day cell to pin the schedule open for selecting text or clicking links. Press `Escape` or click close to dismiss.
- ⚡ **Zero-Setup Google Calendar Sync**:
  - Connect your real Google Calendar events without creating any Google Cloud Console project or OAuth Client ID.
  - Simply paste your calendar's **"Secret address in iCal format"** in Settings.

---

## How to Connect Your Google Calendar (30 Seconds)

1. Open [Google Calendar](https://calendar.google.com) on your computer.
2. In the top-right corner, click the **Settings (gear)** icon &rarr; **Settings**.
3. In the left sidebar, click the calendar you want to sync under *Settings for my calendars*.
4. Scroll down to the **Integrate calendar** section.
5. Copy the URL inside **Secret address in iCal format** (ends with `.ics`).
6. Click the **cal(1)** icon in your Chrome toolbar &rarr; click the **Settings (gear)** icon &rarr; paste the link &rarr; click **Sync**!

---

## How to Reload in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Find **cal(1)** and click the **Reload (circular arrow)** button.
3. Click the **cal(1)** icon in your toolbar to use your auto-syncing calendar!
