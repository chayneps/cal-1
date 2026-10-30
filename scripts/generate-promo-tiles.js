#!/usr/bin/env node
// scripts/generate-promo-tiles.js - Generates official 440x280 and 1400x560 Chrome Web Store Promotional Tiles
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'store-assets');

const PORT = 8898;
const DEBUG_PORT = 9258;
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  console.log('🎨 Generating Chrome Web Store Promotional Tiles...\n');

  // 1. Static Server
  const server = http.createServer((req, res) => {
    let p = path.join(ROOT_DIR, req.url.split('?')[0]);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      res.setHeader('Cache-Control', 'no-store');
      if (p.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
      else if (p.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (p.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
      else if (p.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
      res.end(fs.readFileSync(p));
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  await new Promise(r => server.listen(PORT, r));

  // 2. Launch headless Chrome at 1440x960
  const userDataDir = path.join(os.tmpdir(), `cal1-promo-${Date.now()}`);
  const chromeProc = spawn(CHROME_BIN, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1500,1000',
    '--hide-scrollbars',
    `http://127.0.0.1:${PORT}/store-assets/promo-canvas.html`
  ]);

  let tabs = [];
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      tabs = await resp.json();
      if (tabs.some(t => t.url && t.url.includes('promo-canvas.html'))) break;
    } catch {}
  }

  const pageTab = tabs.find(t => t.url && t.url.includes('promo-canvas.html'));
  if (!pageTab) {
    chromeProc.kill();
    server.close();
    throw new Error('Could not find promo-canvas.html tab');
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === id) {
        ws.removeEventListener('message', handler);
        if (d.error) reject(new Error(JSON.stringify(d.error)));
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  // Allow iframes and popup apps to load
  await new Promise(r => setTimeout(r, 1200));

  await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelectorAll('iframe').forEach(f => {
        try {
          if (f.contentWindow && f.contentWindow.app) {
            f.contentWindow.app.closeSettings();
          }
        } catch {}
      });
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Capture Small Promo Tile (440 x 280)
  const smallRect = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('promoSmall');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });

  const smallShot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: smallRect.result.value.x,
      y: smallRect.result.value.y,
      width: 440,
      height: 280,
      scale: 1
    }
  });

  const smallOut = path.join(OUTPUT_DIR, 'promo-tile-small-440x280.png');
  fs.writeFileSync(smallOut, Buffer.from(smallShot.data, 'base64'));
  console.log(`✅ Saved Small Promo Tile: ${path.relative(ROOT_DIR, smallOut)} (440x280 px)`);

  // 4. Capture Marquee Promo Tile (1400 x 560)
  const marqueeRect = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('promoMarquee');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });

  const marqueeShot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: marqueeRect.result.value.x,
      y: marqueeRect.result.value.y,
      width: 1400,
      height: 560,
      scale: 1
    }
  });

  const marqueeOut = path.join(OUTPUT_DIR, 'promo-tile-marquee-1400x560.png');
  fs.writeFileSync(marqueeOut, Buffer.from(marqueeShot.data, 'base64'));
  console.log(`✅ Saved Marquee Promo Tile: ${path.relative(ROOT_DIR, marqueeOut)} (1400x560 px)`);

  // Cleanup
  ws.close();
  chromeProc.kill();
  server.close();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  process.exit(0);
})();
