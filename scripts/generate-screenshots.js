#!/usr/bin/env node
// scripts/generate-screenshots.js - Generates 5 high-converting 1280x800 Chrome Web Store Screenshots
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'store-assets', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PORT = 8896;
const DEBUG_PORT = 9256;
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

class ScreenshotGenerator {
  constructor() {
    this.server = null;
    this.chromeProc = null;
    this.ws = null;
    this.msgId = 1;
    this.userDataDir = path.join(os.tmpdir(), `cal1-screenshots-${Date.now()}`);
  }

  async start() {
    // 1. Static HTTP Server
    await new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        let p = path.join(ROOT_DIR, req.url.split('?')[0]);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          if (p.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
          else if (p.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
          else if (p.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
          else if (p.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
          else if (p.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
          else if (p.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
          else if (p.endsWith('.jpg') || p.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
          else if (p.endsWith('.woff2')) res.setHeader('Content-Type', 'font/woff2');
          res.end(fs.readFileSync(p));
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
      this.server.listen(PORT, () => resolve());
    });

    // 2. Headless Chrome at 1280x800
    this.chromeProc = spawn(CHROME_BIN, [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${this.userDataDir}`,
      '--window-size=1280,800',
      '--hide-scrollbars',
      `http://127.0.0.1:${PORT}/store-assets/frame.html`
    ]);

    // 3. Connect DevTools
    let tabs = [];
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
        tabs = await resp.json();
        if (tabs.some(t => t.url && t.url.includes('frame.html'))) break;
      } catch {}
    }

    const frameTab = tabs.find(t => t.url && t.url.includes('frame.html'));
    if (!frameTab) {
      throw new Error('Could not find frame.html tab in Chrome');
    }

    this.ws = new WebSocket(frameTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });

    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Wait for frame and iframe initialization
    await new Promise(r => setTimeout(r, 1200));
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      const handler = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            this.ws.removeEventListener('message', handler);
            if (data.error) reject(new Error(JSON.stringify(data.error)));
            else resolve(data.result);
          }
        } catch (e) {
          reject(e);
        }
      };
      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Evaluation failed: ${desc}`);
    }
    return res.result?.value;
  }

  async capture(filename) {
    const outPath = path.join(OUTPUT_DIR, filename);
    const shot = await this.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 95
    });
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`  📸 Captured: ${filename} (1280x800, ${sizeKb} KB, JPEG / no alpha)`);
  }

  close() {
    if (this.ws) try { this.ws.close(); } catch {}
    if (this.chromeProc) try { this.chromeProc.kill(); } catch {}
    if (this.server) try { this.server.close(); } catch {}
    if (this.userDataDir) try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch {}
  }
}

async function run() {
  console.log('🎨 Generating Chrome Web Store Screenshots (1280×800 JPEG)...');
  const gen = new ScreenshotGenerator();
  await gen.start();

  try {
    // ------------------------------------------------------------------
    // SCENE 1: 4-Month 2x2 Overview
    // ------------------------------------------------------------------
    console.log('\n[1/5] Setting up Scene 1: 4-Month 2x2 Overview...');
    await gen.eval(`
      (() => {
        document.getElementById('badgeText').textContent = 'cal-1 • Unix Terminal Calendar';
        document.getElementById('sceneTitle').textContent = '4-Month 2×2 Grid View';
        document.getElementById('sceneSubtitle').textContent = 'Glance across 4 consecutive months with Spaceship prompt and directional scan transitions';
        
        const ifr = document.getElementById('popupFrame');
        ifr.style.width = '650px';
        ifr.style.height = '520px';
        const win = ifr.contentWindow;
        if (win.app) {
          win.app.useDemoData = false;
          win.app.googleAuthToken = 'mock_token';
          win.app.googleCalendars = [
            { id: 'cal-1', summary: 'Personal', color: '#4285F4', selected: true },
            { id: 'cal-2', summary: 'Work Meetings', color: '#34A853', selected: true }
          ];
          win.app.activeCalendarFilter = 'all';
          win.app.calendarName = 'Personal+Work Meetings';
          win.app.isQuadView = true;
          win.document.body.classList.add('view-quad');
          win.document.body.classList.remove('view-single');
          win.app.updateCalendarHeader();
          win.app.renderQuadView(false);
          if (win.app.lastSyncTimeText) win.app.lastSyncTimeText.textContent = 'SYNC: now';
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await gen.capture('screenshot-1-quad-view.jpg');

    // ------------------------------------------------------------------
    // SCENE 2: Hover Schedule & Task Popover
    // ------------------------------------------------------------------
    console.log('\n[2/5] Setting up Scene 2: Hover Schedule & Task Inspection...');
    await gen.eval(`
      (() => {
        document.getElementById('badgeText').textContent = 'Instant Schedule Inspection';
        document.getElementById('sceneTitle').textContent = 'Hover Day Popover & Event Split';
        document.getElementById('sceneSubtitle').textContent = 'Hover over any day in 4-month view to immediately view scheduled meetings, holidays, and tasks';

        const ifr = document.getElementById('popupFrame');
        ifr.style.width = '650px';
        ifr.style.height = '520px';
        const win = ifr.contentWindow;
        if (win.app) {
          win.app.closeSettings();
          const targetCell = win.document.querySelector('.mini-day-cell:not(.other-month)[data-date]') || win.document.querySelector('.mini-day-cell[data-date]');
          if (targetCell) {
            const dateStr = targetCell.dataset.date;
            const dateObj = new Date(dateStr + 'T00:00:00');
            const demoEvents = [
              { id: 'e1', title: 'Product Architecture Review', calendarName: 'Work Meetings', isAllDay: false, start: { dateTime: dateStr + 'T09:30:00' }, end: { dateTime: dateStr + 'T10:30:00' }, color: '#34A853' },
              { id: 'e2', title: 'Quarterly OKR Planning', calendarName: 'Work Meetings', isAllDay: false, start: { dateTime: dateStr + 'T13:00:00' }, end: { dateTime: dateStr + 'T14:30:00' }, color: '#34A853' },
              { id: 'e3', title: 'Dinner with Family', calendarName: 'Personal', isAllDay: false, start: { dateTime: dateStr + 'T18:30:00' }, end: { dateTime: dateStr + 'T20:00:00' }, color: '#4285F4' },
              { id: 'e4', title: 'Ship v1 Release Archive', calendarName: 'Tasks', isTask: true, isAllDay: true, start: { date: dateStr }, color: '#FBBC05' }
            ];
            win.app.events = demoEvents;
            win.app.showDaySchedulePopover(targetCell, dateObj, demoEvents);
          }
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await gen.capture('screenshot-2-hover-popover.jpg');

    // ------------------------------------------------------------------
    // SCENE 3: 1-Month Focused View
    // ------------------------------------------------------------------
    console.log('\n[3/5] Setting up Scene 3: 1-Month Focused Navigation...');
    await gen.eval(`
      (() => {
        document.getElementById('badgeText').textContent = 'Single Month View';
        document.getElementById('sceneTitle').textContent = '1-Month Focused View & Today Tracker';
        document.getElementById('sceneSubtitle').textContent = 'Deep dive into an individual month with blinking today indicator, event markers, and Spaceship prompt';

        const ifr = document.getElementById('popupFrame');
        ifr.style.width = '460px';
        ifr.style.height = '485px';
        const win = ifr.contentWindow;
        if (win.app) {
          win.app.closeSettings();
          win.app.hidePopover();
          win.app.setQuadView(false);
          win.app.renderMonthGrid();
          if (win.app.lastSyncTimeText) win.app.lastSyncTimeText.textContent = 'SYNC: now';
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await gen.capture('screenshot-3-single-view.jpg');

    // ------------------------------------------------------------------
    // SCENE 4: Google Calendar & Tasks Selection
    // ------------------------------------------------------------------
    console.log('\n[4/5] Setting up Scene 4: Google Calendar & Tasks Selection...');
    await gen.eval(`
      (() => {
        document.getElementById('badgeText').textContent = 'Google Calendar & Tasks';
        document.getElementById('sceneTitle').textContent = 'My Calendars & Other Calendars';
        document.getElementById('sceneSubtitle').textContent = 'Seamless Google Sign-In with collapsible calendar sections, custom checkboxes, and Google Tasks sync';

        const ifr = document.getElementById('popupFrame');
        ifr.style.width = '650px';
        ifr.style.height = '520px';
        const win = ifr.contentWindow;
        if (win.app) {
          win.app.isQuadView = true;
          win.document.body.classList.add('view-quad');
          win.document.body.classList.remove('view-single');
          win.app.renderQuadView(false);

          win.app.googleAuthToken = 'mock_token';
          win.app.googleUserEmail = 'alex.dev@googlemail.com';
          win.app.googleCalendars = [
            { id: 'c1', summary: 'Personal', primary: true, selected: true, color: '#4285F4', backgroundColor: '#4285F4' },
            { id: 'c2', summary: 'Work Meetings', primary: false, selected: true, color: '#34A853', backgroundColor: '#34A853' },
            { id: 'c3', summary: 'Family & Home', primary: false, selected: true, color: '#FBBC05', backgroundColor: '#FBBC05' },
            { id: 'c4', summary: 'Birthdays', isBirthday: true, selected: true, color: '#9C27B0', backgroundColor: '#9C27B0' },
            { id: 'c5', summary: 'Google Tasks', isTask: true, selected: true, color: '#00BCD4', backgroundColor: '#00BCD4' }
          ];
          win.app.openSettings();
          win.app.showGoogleConnectedState(true);
          win.app.renderGoogleCalendarsList();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await gen.capture('screenshot-4-config-modal.jpg');

    // ------------------------------------------------------------------
    // SCENE 5: Terminal Commands & Appearance
    // ------------------------------------------------------------------
    console.log('\n[5/5] Setting up Scene 5: Retro Terminal Themes & Commands...');
    await gen.eval(`
      (() => {
        document.getElementById('badgeText').textContent = 'Terminal Productivity';
        document.getElementById('sceneTitle').textContent = 'POSIX Commands & Retro Themes';
        document.getElementById('sceneSubtitle').textContent = 'Type cal 4, cal 1, or @work in the command bar, with customizable terminal themes & holiday flags';

        const ifr = document.getElementById('popupFrame');
        ifr.style.width = '460px';
        ifr.style.height = '485px';
        const win = ifr.contentWindow;
        if (win.app) {
          win.app.closeSettings();
          win.app.hidePopover();
          win.app.setQuadView(false);
          win.app.renderMonthGrid();
          
          if (win.app.calCommandLine) {
            win.app.calCommandLine.value = 'cal 4';
            win.app.syncCommandInputWidth();
          }
          win.app.showToast('cal ➜ 4-Month View (cal 4)');
          if (win.app.lastSyncTimeText) win.app.lastSyncTimeText.textContent = 'SYNC: now';
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await gen.capture('screenshot-5-terminal-themes.jpg');

    console.log('\n🎉 Successfully generated all 5 Chrome Web Store screenshots!');
    console.log(`📁 Saved to: store-assets/screenshots/`);

  } finally {
    gen.close();
  }
}

run().catch((err) => {
  console.error('Fatal error generating screenshots:', err);
  process.exit(1);
});
