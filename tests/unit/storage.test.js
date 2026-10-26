// tests/unit/storage.test.js
const test = require('node:test');
const assert = require('node:assert');

test('Storage Unit Tests', async (t) => {
  const { Storage } = await import('../../lib/storage.js');

  await t.test('set and get basic items', async () => {
    await Storage.set({ theme: 'matrix', firstDayOfWeek: 1 });
    const res = await Storage.get(['theme', 'firstDayOfWeek']);
    assert.strictEqual(res.theme, 'matrix');
    assert.strictEqual(res.firstDayOfWeek, 1);
  });

  await t.test('get with default object values', async () => {
    const res = await Storage.get({ customSetting: 'default_val', theme: 'fallback' });
    assert.strictEqual(res.customSetting, 'default_val');
    assert.strictEqual(res.theme, 'matrix'); // already set above
  });

  await t.test('remove item', async () => {
    await Storage.remove('theme');
    const res = await Storage.get(['theme']);
    assert.strictEqual(res.theme, undefined);
  });

  await t.test('holidayCountry storage roundtrip', async () => {
    await Storage.set({ holidayCountry: 'TH' });
    const res = await Storage.get(['holidayCountry']);
    assert.strictEqual(res.holidayCountry, 'TH');
  });
});
