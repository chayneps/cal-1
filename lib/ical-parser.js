// lib/ical-parser.js - Simple, robust iCal (.ics) parser for Google Calendar feeds

export function parseICal(icsData, calendarName = 'Google Calendar', color = '#00ff00') {
  const events = [];
  const lines = icsData.split(/\r\n|\n|\r/);
  
  // Handle line folding (lines starting with space/tab are continuations)
  const unfolded = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.substring(1);
      }
    } else if (line.trim()) {
      unfolded.push(line.trim());
    }
  }

  // Detect calendar name from metadata (X-WR-CALNAME or NAME)
  let detectedCalName = calendarName;
  for (const line of unfolded) {
    if (line.startsWith('X-WR-CALNAME:') || line.startsWith('X-WR-CALNAME;')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const val = unescapeICalText(line.substring(colonIdx + 1).trim());
        if (val) detectedCalName = val;
      }
    } else if (line.startsWith('NAME:') || line.startsWith('NAME;')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const val = unescapeICalText(line.substring(colonIdx + 1).trim());
        if (val) detectedCalName = val;
      }
    }
  }

  let currentEvent = null;

  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        calendarName: detectedCalName,
        color,
        summary: '(No title)',
        description: '',
        location: '',
        meetLink: null
      };
    } else if (line === 'END:VEVENT') {
      if (currentEvent && (currentEvent.start)) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const propPart = line.substring(0, colonIdx);
      const val = line.substring(colonIdx + 1);
      const propName = propPart.split(';')[0].toUpperCase();

      if (propName === 'SUMMARY') {
        currentEvent.summary = unescapeICalText(val);
      } else if (propName === 'DESCRIPTION') {
        currentEvent.description = unescapeICalText(val);
        // Look for Google Meet link
        const meetMatch = val.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i);
        if (meetMatch) currentEvent.meetLink = meetMatch[0];
      } else if (propName === 'LOCATION') {
        currentEvent.location = unescapeICalText(val);
        if (val.includes('meet.google.com')) {
          currentEvent.meetLink = val.trim();
        }
      } else if (propName === 'DTSTART') {
        const isDateOnly = propPart.includes('VALUE=DATE') || val.length === 8;
        if (isDateOnly) {
          const y = val.substring(0, 4);
          const m = val.substring(4, 6);
          const d = val.substring(6, 8);
          currentEvent.start = { date: `${y}-${m}-${d}` };
          currentEvent.isAllDay = true;
        } else {
          currentEvent.start = { dateTime: parseICalDate(val) };
          currentEvent.isAllDay = false;
        }
      } else if (propName === 'DTEND') {
        const isDateOnly = propPart.includes('VALUE=DATE') || val.length === 8;
        if (isDateOnly) {
          const y = val.substring(0, 4);
          const m = val.substring(4, 6);
          const d = val.substring(6, 8);
          currentEvent.end = { date: `${y}-${m}-${d}` };
        } else {
          currentEvent.end = { dateTime: parseICalDate(val) };
        }
      } else if (propName === 'UID') {
        currentEvent.id = val;
      }
    }
  }

  events.calendarName = detectedCalName;
  return events;
}

function parseICalDate(str) {
  // e.g. 20261024T150000Z or 20261024T150000
  const cleaned = str.replace(/[^0-9TZ]/g, '');
  const y = cleaned.substring(0, 4);
  const m = cleaned.substring(4, 6);
  const d = cleaned.substring(6, 8);
  const h = cleaned.substring(9, 11) || '00';
  const min = cleaned.substring(11, 13) || '00';
  const s = cleaned.substring(13, 15) || '00';

  if (cleaned.endsWith('Z')) {
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s)).toISOString();
  }
  return new Date(+y, +m - 1, +d, +h, +min, +s).toISOString();
}

function unescapeICalText(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
