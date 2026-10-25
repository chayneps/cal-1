// lib/mock-data.js - Generates dynamic sample Google Calendar events
export function getMockCalendars() {
  return [
    { id: 'work', summary: 'Work & Projects', backgroundColor: '#00ff00', primary: true, selected: true },
    { id: 'personal', summary: 'Personal & Life', backgroundColor: '#00e5e5', selected: true },
    { id: 'deadlines', summary: 'Milestones & Tasks', backgroundColor: '#e5e500', selected: true },
    { id: 'team', summary: 'Team & Social', backgroundColor: '#e500e5', selected: true }
  ];
}

export function generateMockEvents(year, month) {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  const pad = (n) => String(n).padStart(2, '0');
  const makeDate = (day) => `${year}-${pad(month + 1)}-${pad(day)}`;
  const makeDateTime = (day, hour, min = 0) => {
    return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(min)}:00`;
  };

  const today = new Date();
  const currentDay = (today.getFullYear() === year && today.getMonth() === month) ? today.getDate() : 15;

  const events = [];

  // 1. All-Day Event: Today + 1
  events.push({
    id: 'mock-allday-1',
    calendarId: 'team',
    calendarName: 'Team & Social',
    color: '#e500e5',
    summary: '🚀 Product Launch & All-Hands',
    start: { date: makeDate(currentDay) },
    end: { date: makeDate(currentDay) },
    isAllDay: true,
    location: 'Main Auditorium & Live Stream',
    meetLink: 'https://meet.google.com/hnd-prod-sum',
    description: 'Quarterly milestone presentation and celebration with the global team.'
  });

  // 2. Schedule for Today (Morning to Evening)
  events.push({
    id: 'mock-today-1',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Daily Engineering Standup',
    start: { dateTime: makeDateTime(currentDay, 9, 0) },
    end: { dateTime: makeDateTime(currentDay, 9, 30) },
    isAllDay: false,
    location: 'Remote',
    meetLink: 'https://meet.google.com/eng-stnd-up1',
    description: 'Quick sync on blockers, in-flight PRs, and daily priorities.'
  });

  events.push({
    id: 'mock-today-2',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Architecture & System Design Review',
    start: { dateTime: makeDateTime(currentDay, 11, 0) },
    end: { dateTime: makeDateTime(currentDay, 12, 15) },
    isAllDay: false,
    location: 'Conference Room 4B / Meet',
    meetLink: 'https://meet.google.com/arc-dsgn-rev',
    description: 'Deep dive into event-driven sync pipeline and caching benchmarks.'
  });

  events.push({
    id: 'mock-today-3',
    calendarId: 'personal',
    calendarName: 'Personal & Life',
    color: '#00e5e5',
    summary: '🥗 Lunch & Walk with David',
    start: { dateTime: makeDateTime(currentDay, 12, 30) },
    end: { dateTime: makeDateTime(currentDay, 13, 30) },
    isAllDay: false,
    location: 'Park Cafe Plaza',
    description: 'Catching up on side projects and outdoor walk.'
  });

  events.push({
    id: 'mock-today-4',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: '1-on-1 with Product Manager',
    start: { dateTime: makeDateTime(currentDay, 14, 30) },
    end: { dateTime: makeDateTime(currentDay, 15, 15) },
    isAllDay: false,
    location: 'Google Meet',
    meetLink: 'https://meet.google.com/pdm-one-one',
    description: 'Reviewing Q4 roadmap timeline and UX user feedback.'
  });

  events.push({
    id: 'mock-today-5',
    calendarId: 'deadlines',
    calendarName: 'Milestones & Tasks',
    color: '#e5e500',
    summary: '⚡ Code Freeze: v1.4 Release Candidate',
    start: { dateTime: makeDateTime(currentDay, 17, 0) },
    end: { dateTime: makeDateTime(currentDay, 17, 30) },
    isAllDay: false,
    location: 'GitHub CI/CD',
    description: 'Tagging stable branch and deploying staging build.'
  });

  events.push({
    id: 'mock-today-6',
    calendarId: 'personal',
    calendarName: 'Personal & Life',
    color: '#00e5e5',
    summary: '🏋️ Evening Gym Workout (HIIT & Strength)',
    start: { dateTime: makeDateTime(currentDay, 18, 30) },
    end: { dateTime: makeDateTime(currentDay, 19, 45) },
    isAllDay: false,
    location: 'Equinox Gym',
    description: 'Focus on upper body strength and 20 min cardio.'
  });

  // 3. Yesterday
  const yesterday = Math.max(1, currentDay - 1);
  events.push({
    id: 'mock-yest-1',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Sprint Retrospective & Demo',
    start: { dateTime: makeDateTime(yesterday, 10, 0) },
    end: { dateTime: makeDateTime(yesterday, 11, 30) },
    isAllDay: false,
    meetLink: 'https://meet.google.com/spr-retro-dem',
    location: 'Google Meet'
  });
  events.push({
    id: 'mock-yest-2',
    calendarId: 'personal',
    calendarName: 'Personal & Life',
    color: '#00e5e5',
    summary: 'Dentist Checkup',
    start: { dateTime: makeDateTime(yesterday, 15, 0) },
    end: { dateTime: makeDateTime(yesterday, 16, 0) },
    isAllDay: false,
    location: 'Downtown Dental Clinic'
  });

  // 4. Tomorrow
  const tomorrow = Math.min(28, currentDay + 1);
  events.push({
    id: 'mock-tmrw-1',
    calendarId: 'team',
    calendarName: 'Team & Social',
    color: '#e500e5',
    summary: '🎂 Sarah Birthday Lunch',
    start: { dateTime: makeDateTime(tomorrow, 12, 0) },
    end: { dateTime: makeDateTime(tomorrow, 13, 30) },
    isAllDay: false,
    location: 'Trattoria Bella'
  });
  events.push({
    id: 'mock-tmrw-2',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Customer Feedback & Usability Interview',
    start: { dateTime: makeDateTime(tomorrow, 14, 0) },
    end: { dateTime: makeDateTime(tomorrow, 15, 0) },
    isAllDay: false,
    meetLink: 'https://meet.google.com/usr-int-cust',
    location: 'Google Meet'
  });
  events.push({
    id: 'mock-tmrw-3',
    calendarId: 'personal',
    calendarName: 'Personal & Life',
    color: '#00e5e5',
    summary: 'Grocery Shopping & Meal Prep',
    start: { dateTime: makeDateTime(tomorrow, 18, 0) },
    end: { dateTime: makeDateTime(tomorrow, 19, 0) },
    isAllDay: false,
    location: 'Whole Foods Market'
  });

  // 5. Earlier in the month (e.g. Day 4, 8, 12)
  events.push({
    id: 'mock-day-4',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Quarterly Planning Session',
    start: { dateTime: makeDateTime(4, 10, 0) },
    end: { dateTime: makeDateTime(4, 12, 0) },
    isAllDay: false,
    meetLink: 'https://meet.google.com/qtr-plan-eng'
  });
  events.push({
    id: 'mock-day-8',
    calendarId: 'deadlines',
    calendarName: 'Milestones & Tasks',
    color: '#e5e500',
    summary: 'Tax Filing Deadline',
    start: { date: makeDate(8) },
    end: { date: makeDate(8) },
    isAllDay: true,
    location: 'Online'
  });
  events.push({
    id: 'mock-day-12',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'UX UI Design Critique',
    start: { dateTime: makeDateTime(12, 13, 0) },
    end: { dateTime: makeDateTime(12, 14, 0) },
    isAllDay: false,
    meetLink: 'https://meet.google.com/ux-ui-review'
  });

  // 6. Later in the month (e.g. Day 20, 24, 27)
  events.push({
    id: 'mock-day-20-1',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Security & Penetration Test Audit',
    start: { dateTime: makeDateTime(20, 9, 30) },
    end: { dateTime: makeDateTime(20, 11, 0) },
    isAllDay: false,
    location: 'Security Room'
  });
  events.push({
    id: 'mock-day-20-2',
    calendarId: 'team',
    calendarName: 'Team & Social',
    color: '#e500e5',
    summary: 'Game Night: Board Games & Pizza 🍕',
    start: { dateTime: makeDateTime(20, 18, 0) },
    end: { dateTime: makeDateTime(20, 21, 0) },
    isAllDay: false,
    location: 'Community Lounge'
  });

  events.push({
    id: 'mock-day-24',
    calendarId: 'personal',
    calendarName: 'Personal & Life',
    color: '#00e5e5',
    summary: 'Weekend Hiking Trip 🌲',
    start: { date: makeDate(24) },
    end: { date: makeDate(24) },
    isAllDay: true,
    location: 'Redwood State Park'
  });

  events.push({
    id: 'mock-day-27',
    calendarId: 'work',
    calendarName: 'Work & Projects',
    color: '#00ff00',
    summary: 'Client Presentation: Phase 2 Demo',
    start: { dateTime: makeDateTime(27, 14, 0) },
    end: { dateTime: makeDateTime(27, 15, 30) },
    isAllDay: false,
    meetLink: 'https://meet.google.com/clt-pres-phs2'
  });

  return events;
}
