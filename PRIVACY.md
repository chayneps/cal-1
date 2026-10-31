# Privacy Policy for cal-1

> Last updated: October 28, 2026

`cal-1` is committed to protecting your privacy. This Privacy Policy explains how data is handled by the `cal-1` Chrome extension.

---

## 1. What Data We Access and Collect

- **Google Account Profile**: When you connect your Google account, `cal-1` retrieves your display name and email address strictly to display your connected status in the settings menu.
- **Calendar Feeds & Events**: `cal-1` accesses your Google Calendars (and optional Google Tasks) via official Google APIs to fetch event titles, start/end dates, color coding, and tasks.
- **User Preferences**: Your chosen calendar filter, visual theme, active view (1-month or 4-month), sync interval, and custom calendar selections are stored.

---

## 2. How Data Is Stored

- **100% Local Storage**: All calendar events, user preferences, and OAuth tokens are stored locally on your device in your browser's private `chrome.storage.local`.
- **No External Servers**: `cal-1` does not operate or communicate with any private developer servers, databases, or analytics services. All network requests are made directly between your browser and official Google API endpoints (`https://www.googleapis.com/*` and `https://accounts.google.com/*`).

---

## 3. How Data Is Used

The accessed data is used solely to provide core calendar functionality:
- Rendering the interactive 1-month and 4-month calendar views.
- Displaying scheduled events and tasks on hover popovers and daily indicators.
- Synchronizing event updates on your requested schedule.

---

## 4. Data Sharing & Third Parties

- **No Third-Party Sharing**: We do **not** sell, rent, trade, or transfer your personal data or calendar contents to any third parties or advertisers.
- **No Telemetry / Analytics**: `cal-1` does not include tracking pixels, telemetry scripts, or analytics libraries.

---

## 5. Google API Limited Use Disclosure

`cal-1`'s use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

---

## 6. User Control & Data Deletion

- You can disconnect your Google Account at any time by clicking **Disconnect** in the settings panel. Disconnecting immediately deletes the stored access token and clears all cached Google events from your device.
- Uninstalling the `cal-1` extension removes all stored data and preferences from your browser automatically.

---

## 7. Contact

If you have any questions or feedback regarding this Privacy Policy, please open an issue on GitHub:
https://github.com/chayneps/cal-1
