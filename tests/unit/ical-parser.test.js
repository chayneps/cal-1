// tests/unit/ical-parser.test.js
const test = require('node:test');
const assert = require('node:assert');

test('iCal Parser Unit Tests', async (t) => {
  const { parseICal } = await import('../../lib/ical-parser.js');

  await t.test('parse calendar name from X-WR-CALNAME', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
X-WR-CALNAME:Engineering Sync
BEGIN:VEVENT
UID:event-1@google.com
SUMMARY:Sprint Retrospective
DTSTART:20261026T140000Z
DTEND:20261026T150000Z
END:VEVENT
END:VCALENDAR`;

    const events = parseICal(ics);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].calendarName, 'Engineering Sync');
    assert.strictEqual(events[0].summary, 'Sprint Retrospective');
    assert.strictEqual(events[0].isAllDay, false);
  });

  await t.test('parse all-day event correctly', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-allday@google.com
SUMMARY:Company Hackathon
DTSTART;VALUE=DATE:20261026
DTEND;VALUE=DATE:20261027
END:VEVENT
END:VCALENDAR`;

    const events = parseICal(ics);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].isAllDay, true);
    assert.strictEqual(events[0].summary, 'Company Hackathon');
    assert.strictEqual(events[0].start.date, '2026-10-26');
  });

  await t.test('handle folded lines and unescaping', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-folded@google.com
SUMMARY:Very long meeting title that has been folded
  into multiple lines by the iCalendar server
DESCRIPTION:Line 1\\nLine 2 with \\, comma
DTSTART:20261026T160000Z
DTEND:20261026T170000Z
END:VEVENT
END:VCALENDAR`;

    const events = parseICal(ics);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].summary, 'Very long meeting title that has been folded into multiple lines by the iCalendar server');
    assert.ok(events[0].description.includes('Line 1\nLine 2 with , comma'));
  });
});
