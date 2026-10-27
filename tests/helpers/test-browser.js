// tests/helpers/test-browser.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

class TestBrowser {
  constructor(options = {}) {
    this.port = options.port || 8890;
    this.debugPort = options.debugPort || 9250;
    this.chromeBin = options.chromeBin || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    this.server = null;
    this.chromeProc = null;
    this.ws = null;
    this.msgId = 1;
  }

  async start() {
    // 1. Create HTTP static server
    await new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        let p = path.join(process.cwd(), req.url.split('?')[0]);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          if (p.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
          else if (p.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
          else if (p.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
          else if (p.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
          else if (p.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
          res.end(fs.readFileSync(p));
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
      this.server.listen(this.port, () => resolve());
    });

    // 2. Launch headless Chrome with isolated user data directory
    this.userDataDir = path.join(os.tmpdir(), `cal1-chrome-${this.debugPort}-${Date.now()}`);
    this.chromeProc = spawn(this.chromeBin, [
      '--headless=new',
      `--remote-debugging-port=${this.debugPort}`,
      `--user-data-dir=${this.userDataDir}`,
      '--window-size=380,560',
      `http://127.0.0.1:${this.port}/popup/popup.html`
    ]);

    // 3. Wait for DevTools HTTP endpoint and find popup page tab
    let tabs = [];
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const resp = await fetch(`http://127.0.0.1:${this.debugPort}/json`);
        tabs = await resp.json();
        if (tabs.some(t => t.url && t.url.includes('popup.html'))) break;
      } catch {}
    }

    const pageTab = tabs.find(t => t.url && t.url.includes('popup.html'));
    if (!pageTab) {
      this.close();
      throw new Error('Failed to find popup.html tab in headless Chrome');
    }

    // 4. Connect DevTools WebSocket
    this.ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });

    await this.send('Runtime.enable');
    await this.send('Page.enable');
    // Allow initial app.init() and renders to complete
    await new Promise(r => setTimeout(r, 600));
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

  async reload() {
    await this.send('Page.reload');
    await new Promise(r => setTimeout(r, 800));
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    if (this.chromeProc) {
      try { this.chromeProc.kill(); } catch {}
    }
    if (this.server) {
      try { this.server.close(); } catch {}
    }
    if (this.userDataDir) {
      try { fs.rmSync(this.userDataDir, { recursive: true, force: true }); } catch {}
    }
  }
}

module.exports = { TestBrowser };
