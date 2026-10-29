# Chrome Web Store Listing — cal-1

> Last Updated: 2026-10-28

---

## Store Listing

**Extension Name** [REQUIRED]  
`cal-1`

**Short Description** [REQUIRED] (Max 132 characters)  
`Unix cal-inspired terminal calendar with Spaceship prompt, 4-month 2x2 view, hover schedules, and Google Calendar sync.`

**Detailed Description** [REQUIRED]  
```text
cal-1 brings the speed, minimalism, and aesthetic of the classic Unix cal utility into your Chrome browser, paired with modern Spaceship prompt styling and seamless Google Calendar sync.

KEY FEATURES
• Spaceship Prompt Header: Clean terminal-style prompt indicating the active calendar feed and quick switcher.
• 4-Month 2×2 Overview: See four consecutive months side by side with uniform grid cards, Thai daily color coding, and directional scan transitions.
• 1-Month Focused View: Click any month card or use arrow navigation to zoom into a detailed monthly calendar.
• Full-Width Hover Popover: Hover over any day in 4-month view to immediately inspect scheduled meetings, tasks, and holiday banners.
• Google Calendar & Tasks Integration: Connect with one click to sync personal, work, birthday, and task lists without entering client IDs.
• Smart Multi-Calendar Top Bar: Displays combined calendar names (e.g., Personal+Work) when up to 3 calendars are selected, or "all" for larger collections.
• Interactive Bottom Line: Retro typewriter-animated status line indicating month ranges, sync times, and instant reconnection alerts if authorization expires.
• Terminal Keyboard Shortcuts: Navigate with arrow keys, toggle views with standard commands, and customize your experience with retro terminal themes.
• Offline Ready: Caches public holidays and calendar data locally so your schedule is always instantly accessible.

HOW TO USE IT
1. Click the cal-1 icon in your browser toolbar to open the dropdown.
2. Navigate between months using your keyboard arrow keys or the top navigation bar.
3. Hover over any date cell to view schedule details and tasks in the opposite panel.
4. Open Settings to connect your Google account, select calendars, or switch color themes.

PRIVACY & SECURITY
cal-1 communicates directly and exclusively with official Google Calendar APIs. All settings, preferences, and cached event details are kept strictly on your local device. No personal data or event contents are ever sent to any third-party server.
```

**Category** [REQUIRED]  
`Productivity` (Alternative: `Developer Tools`)

**Single Purpose** [REQUIRED]  
`Provides a lightweight, terminal-inspired calendar popup with multi-month viewing, quick scheduling, and Google Calendar synchronization.`

**Primary Language** [REQUIRED]  
`English`

---

## Graphics & Assets

| Asset | Dimensions | Status | Notes |
|---|---|---|---|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ To Capture | 4-Month 2×2 overview with Spaceship header |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Hover popover showing split schedule details |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | 1-Month focused view with event indicators |
| Screenshot 4 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Settings dialog with Google Calendar selection |
| Small Promo Tile [RECOMMENDED] | 440×280 PNG | ⬜ To Create | Retro terminal logo and headline |
| Marquee Promo Tile | 1400×560 PNG | ⬜ Optional | For Chrome Web Store home banner |

---

## Permissions Justification

| Permission | Type | Plain-English Justification |
|---|---|---|
| `storage` | `permissions` | Required to persist user preferences (active theme, sync interval, selected calendars) and cache calendar events locally for instant startup and offline access. |
| `alarms` | `permissions` | Required to schedule periodic background sync cycles with Google Calendar based on user preferences. |
| `identity` | `permissions` | Required to authenticate with Google APIs using Chrome's native OAuth 2.0 identity provider to securely retrieve user calendars. |
| `https://calendar.google.com/*` | `host_permissions` | Required to fetch public and private iCal/webcal calendar feeds configured by the user. |
| `https://www.googleapis.com/*` | `host_permissions` | Required to access Google Calendar REST APIs (`/calendar/v3/`) and Google Tasks APIs (`/tasks/v1/`) to retrieve events and tasks. |
| `https://accounts.google.com/*` | `host_permissions` | Required to verify OAuth tokens and retrieve account profile identity during sign-in. |

---

## Privacy & Data Use Disclosures

### Data Collection
**Does the extension collect user data?** Yes (Authentication info and calendar/task data strictly on-device).

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with 3rd Parties? |
|---|---|---|---|---|
| Personally identifiable info | Yes | No | Account email / name displayed in settings | No |
| Authentication info | Yes | No | OAuth tokens saved locally in `chrome.storage.local` | No |
| Calendar & Task contents | Yes | No | Display events, reminders, and tasks locally | No |
| Health / Financial info | No | No | N/A | No |
| Web browsing history | No | No | N/A | No |
| Location | No | No | N/A | No |

### Data Use Certifications
- [x] Data is **NOT** sold to third parties.
- [x] Data is **NOT** used for purposes unrelated to the extension's core functionality.
- [x] Data is **NOT** used for creditworthiness or lending purposes.

---

## Distribution & Publication Steps

1. **Package File**:  
   Run `npm run package` to generate the clean ZIP: `dist/cal-1-v1.zip`.
2. **Chrome Developer Dashboard**:  
   Visit [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
3. **Submit Extension**:  
   - Click **Add new item** and upload `dist/cal-1-v1.zip`.
   - Copy and paste the Store Listing and Permissions Justification details above.
   - Upload screenshots (at least 1 screenshot at 1280×800 or 640×400).
   - Link your Privacy Policy URL.
   - Click **Submit for Review**.
