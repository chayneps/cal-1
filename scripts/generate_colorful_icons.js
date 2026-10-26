const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ICONS_DIR = path.resolve(__dirname, '../icons');
const TEMP_HTML = path.resolve(__dirname, 'temp_icon_builder.html');
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9226;

const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
// Toned-down colors matching the app's aesthetic
const thaiColors = [
  '#b84a4a', // Sun: soft crimson
  '#b88d2a', // Mon: soft gold
  '#ad4a7c', // Tue: soft rose
  '#3a9459', // Wed: soft sage green
  '#ba6b32', // Thu: soft terracotta orange
  '#3d8ca8', // Fri: soft steel blue
  '#8052ad'  // Sat: soft amethyst
];

function drawRoundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Vector Spaceship Prompt Arrow ➜
function drawSpaceshipArrow(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  const s = size / 10;
  ctx.beginPath();
  ctx.moveTo(0, 3 * s);
  ctx.lineTo(5 * s, 3 * s);
  ctx.lineTo(5 * s, 1 * s);
  ctx.lineTo(10 * s, 5 * s);
  ctx.lineTo(5 * s, 9 * s);
  ctx.lineTo(5 * s, 7 * s);
  ctx.lineTo(0, 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  if (size === 16) {
    // -------------------------------------------------------------
    // 16x16 Toolbar Icon (Pixel Optimized, Toned Down, No Border)
    // -------------------------------------------------------------
    ctx.save();
    drawRoundRect(ctx, 0, 0, 16, 16, 3);
    ctx.clip();
    
    // Pure Black terminal body
    ctx.fillStyle = '#0a0d0a';
    ctx.fillRect(0, 0, 16, 16);

    // 7 Toned Thai stripes across top
    const stripeW = 16 / 7;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = thaiColors[i];
      ctx.fillRect(i * stripeW, 0, stripeW + 0.3, 4.5);
    }
    // Subtle separator line
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 4.5, 16, 1);
    ctx.restore();

    // Soft silver binder rings
    ctx.fillStyle = '#d0d5dd';
    ctx.fillRect(4, 0, 2, 2);
    ctx.fillRect(10, 0, 2, 2);

    // Pixel-perfect 'cal' in app terminal green #00dd00
    ctx.fillStyle = '#00dd00';
    // 'c' at x=3..5, y=8..12
    ctx.fillRect(4, 8, 2, 1);
    ctx.fillRect(3, 9, 1, 3);
    ctx.fillRect(4, 12, 2, 1);
    
    // 'a' at x=7..9, y=8..12
    ctx.fillRect(8, 8, 2, 1);
    ctx.fillRect(9, 9, 1, 1);
    ctx.fillRect(8, 10, 2, 1);
    ctx.fillRect(7, 11, 1, 1); ctx.fillRect(9, 11, 1, 1);
    ctx.fillRect(8, 12, 2, 1);
    
    // 'l' at x=11..12, y=7..12
    ctx.fillRect(11, 7, 1, 5);
    ctx.fillRect(12, 12, 1, 1);

    return canvas.toDataURL('image/png');
  }

  if (size === 32) {
    // -------------------------------------------------------------
    // 32x32 Retina Toolbar Icon (Toned Down, No Border)
    // -------------------------------------------------------------
    const pad = 0.5;
    const w = size - pad * 2;
    const h = size - pad * 2;
    const r = 5;

    ctx.save();
    drawRoundRect(ctx, pad, pad, w, h, r);
    ctx.clip();
    ctx.fillStyle = '#0a0d0a';
    ctx.fillRect(pad, pad, w, h);

    // 7 Toned Thai stripes
    const headerH = 10;
    const stripeW = w / 7;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = thaiColors[i];
      ctx.fillRect(pad + i * stripeW, pad, stripeW + 0.4, headerH);
    }
    // Separator
    ctx.fillStyle = '#000000';
    ctx.fillRect(pad, pad + headerH - 1, w, 1);
    ctx.restore();

    // Soft silver binder rings
    const ringW = 2.5;
    const ringH = 4;
    const ringY = 0;
    ctx.fillStyle = '#d0d5dd';
    drawRoundRect(ctx, pad + w * 0.28 - ringW / 2, ringY, ringW, ringH, 1);
    ctx.fill();
    drawRoundRect(ctx, pad + w * 0.72 - ringW / 2, ringY, ringW, ringH, 1);
    ctx.fill();

    // Body: Spaceship arrow + 'cal'
    const bodyCenterY = pad + headerH + (h - headerH) * 0.52;
    drawSpaceshipArrow(ctx, pad + 3, bodyCenterY - 3.5, 7.5, '#db2777');

    // 'cal' in app terminal green #00dd00
    ctx.fillStyle = '#00dd00';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('cal', pad + 13, bodyCenterY);

    return canvas.toDataURL('image/png');
  }

  if (size === 48) {
    // -------------------------------------------------------------
    // 48x48 Icon (Extensions Management / High DPI, Toned Down)
    // -------------------------------------------------------------
    const pad = 1;
    const w = size - pad * 2;
    const h = size - pad * 2;
    const r = 7;

    ctx.save();
    drawRoundRect(ctx, pad, pad, w, h, r);
    ctx.clip();
    ctx.fillStyle = '#0a0d0a';
    ctx.fillRect(pad, pad, w, h);

    // 7 Toned Thai stripes
    const headerH = 15;
    const stripeW = w / 7;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = thaiColors[i];
      ctx.fillRect(pad + i * stripeW, pad, stripeW + 0.4, headerH);
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(pad, pad + headerH - 1, w, 1);
    ctx.restore();

    // Rings
    ctx.fillStyle = '#d0d5dd';
    drawRoundRect(ctx, pad + w * 0.28 - 2, 0.5, 4, 5.5, 1.5);
    ctx.fill();
    drawRoundRect(ctx, pad + w * 0.72 - 2, 0.5, 4, 5.5, 1.5);
    ctx.fill();

    const bodyTop = pad + headerH;
    const bodyH = h - headerH;

    // Vector spaceship arrow
    const arrowY = bodyTop + bodyH * 0.35;
    drawSpaceshipArrow(ctx, pad + 5, arrowY - 5, 10, '#db2777');

    ctx.fillStyle = '#00dd00';
    ctx.font = 'bold 14px "Hack", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('cal', pad + 19, arrowY);

    // 7 Toned Thai dots
    const dotY = bodyTop + bodyH * 0.76;
    const step = (w - 12) / 6;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = thaiColors[i];
      ctx.beginPath();
      ctx.arc(pad + 6 + i * step, dotY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  }

  // -------------------------------------------------------------
  // 128x128 Master Icon (Toned Down)
  // -------------------------------------------------------------
  const pad = 2;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const r = 18;

  ctx.save();
  drawRoundRect(ctx, pad, pad, w, h, r);
  ctx.clip();
  ctx.fillStyle = '#0a0d0a';
  ctx.fillRect(pad, pad, w, h);

  // Top header: 7 Toned stripes with subtle gradient
  const headerH = 40;
  const stripeW = w / 7;
  for (let i = 0; i < 7; i++) {
    const grad = ctx.createLinearGradient(0, pad, 0, pad + headerH);
    grad.addColorStop(0, thaiColors[i]);
    grad.addColorStop(1, thaiColors[i]);
    ctx.fillStyle = grad;
    ctx.fillRect(pad + i * stripeW, pad, stripeW + 0.5, headerH);
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(pad, pad + headerH - 2, w, 2);
  ctx.restore();

  // Silver binder rings
  const ringW = 9;
  const ringH = 14;
  const ringY = 1;
  ctx.fillStyle = '#d0d5dd';
  drawRoundRect(ctx, pad + w * 0.28 - ringW / 2, ringY, ringW, ringH, 3);
  ctx.fill();
  drawRoundRect(ctx, pad + w * 0.72 - ringW / 2, ringY, ringW, ringH, 3);
  ctx.fill();

  // Ring shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(pad + w * 0.28 - ringW / 2, ringY + ringH * 0.55, ringW, ringH * 0.45);
  ctx.fillRect(pad + w * 0.72 - ringW / 2, ringY + ringH * 0.55, ringW, ringH * 0.45);

  const bodyTop = pad + headerH;
  const bodyH = h - headerH;
  const promptY = bodyTop + bodyH * 0.35;

  // Vector spaceship arrow
  drawSpaceshipArrow(ctx, pad + 14, promptY - 12, 24, '#db2777');

  // 'cal' in app terminal green #00dd00
  ctx.fillStyle = '#00dd00';
  ctx.font = 'bold 32px "Hack", Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('cal', pad + 44, promptY);

  // 7 Toned dots
  const dotY = bodyTop + bodyH * 0.75;
  const step = (w - 24) / 6;
  for (let i = 0; i < 7; i++) {
    const cx = pad + 12 + i * step;
    ctx.fillStyle = thaiColors[i];
    ctx.beginPath();
    ctx.arc(cx, dotY, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

window.__GENERATED_ICONS__ = {
  16: renderIcon(16),
  32: renderIcon(32),
  48: renderIcon(48),
  128: renderIcon(128)
};
</script>
</body>
</html>
`;

fs.writeFileSync(TEMP_HTML, htmlContent);

async function run() {
  console.log('Spawning headless Chrome...');
  const chrome = spawn(CHROME_BIN, [
    '--headless',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    `file://${TEMP_HTML}`
  ]);

  let killed = false;
  const cleanup = () => {
    if (!killed) {
      killed = true;
      chrome.kill('SIGKILL');
      try { fs.unlinkSync(TEMP_HTML); } catch(e) {}
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  // Poll for Chrome CDP JSON
  let wsUrl = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const json = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json`, res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
      const targets = JSON.parse(json);
      const page = targets.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch(e) {}
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket debugger URL from Chrome');
    cleanup();
    process.exit(1);
  }

  console.log('Connecting WebSocket to Chrome CDP...');
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    const msg = JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: 'JSON.stringify(window.__GENERATED_ICONS__)',
        returnByValue: true
      }
    });
    ws.send(msg);
  });

  ws.addEventListener('message', event => {
    const res = JSON.parse(event.data);
    if (res.id === 1) {
      const icons = JSON.parse(res.result.result.value);
      fs.mkdirSync(ICONS_DIR, { recursive: true });

      for (const size of [16, 32, 48, 128]) {
        const dataUrl = icons[size];
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const buf = Buffer.from(base64, 'base64');
        const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
        fs.writeFileSync(outPath, buf);
        console.log(`Successfully generated ${outPath} (${buf.length} bytes)`);
      }

      cleanup();
      console.log('All icons successfully updated!');
      process.exit(0);
    }
  });

  ws.addEventListener('error', err => {
    console.error('WebSocket error:', err);
    cleanup();
    process.exit(1);
  });
}

run();
