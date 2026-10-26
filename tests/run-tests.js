#!/usr/bin/env node
// tests/run-tests.js - cal-1 Master Regression Test Suite Runner

const { spawn } = require('child_process');
const path = require('path');

const testSuites = [
  { name: 'Unit: Public Holidays & Offline Bundles', file: 'tests/unit/holidays.test.js' },
  { name: 'Unit: Local & Fallback Storage Engine', file: 'tests/unit/storage.test.js' },
  { name: 'Unit: iCalendar (.ics) Parser', file: 'tests/unit/ical-parser.test.js' },
  { name: 'E2E: Public Holidays (UI, Flags, Persistence)', file: 'tests/e2e/holidays.test.js' },
  { name: 'E2E: Month Navigation, Popovers & Animation', file: 'tests/e2e/navigation.test.js' },
  { name: 'E2E: Appearance, Today Header Sync & Themes', file: 'tests/e2e/appearance.test.js' },
  { name: 'E2E: 4-Month 2×2 Zoom View (cal 4)', file: 'tests/e2e/quad-view.test.js' }
];

console.log('========================================================');
console.log('           cal-1 REGRESSION TEST SUITE (v1)             ');
console.log('========================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const startTime = Date.now();

async function runSuite(suite) {
  process.stdout.write(`▶ Running: ${suite.name} ... `);
  const suiteStart = Date.now();

  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test', suite.file], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      const duration = ((Date.now() - suiteStart) / 1000).toFixed(2);
      if (code === 0) {
        console.log(`\x1b[32mPASS\x1b[0m (${duration}s)`);
        totalPassed++;
        resolve({ ok: true });
      } else {
        console.log(`\x1b[31mFAIL\x1b[0m (${duration}s)`);
        console.error('\n--- Failure Output ---');
        console.error(stdout || stderr);
        console.error('----------------------\n');
        totalFailed++;
        resolve({ ok: false });
      }
    });
  });
}

async function runAll() {
  for (const suite of testSuites) {
    await runSuite(suite);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n========================================================');
  console.log(`Test Suites: \x1b[32m${totalPassed} passed\x1b[0m, ${totalFailed ? `\x1b[31m${totalFailed} failed\x1b[0m, ` : ''}${testSuites.length} total`);
  console.log(`Time:        ${totalDuration}s`);
  console.log('========================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
