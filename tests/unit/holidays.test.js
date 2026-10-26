// tests/unit/holidays.test.js
const test = require('node:test');
const assert = require('node:assert');

test('Holidays Unit Tests', async (t) => {
  const holidaysModule = await import('../../lib/holidays.js');
  const {
    getCountryFlag,
    TOP_COUNTRIES,
    OTHER_COUNTRIES,
    STATIC_HOLIDAYS,
    getHolidaysForYear
  } = holidaysModule;

  await t.test('TOP_COUNTRIES order and content', () => {
    assert.strictEqual(TOP_COUNTRIES.length, 3, 'Top countries should contain exactly 3 items');
    assert.strictEqual(TOP_COUNTRIES[0].code, 'CA', 'First country should be Canada');
    assert.strictEqual(TOP_COUNTRIES[1].code, 'US', 'Second country should be United States');
    assert.strictEqual(TOP_COUNTRIES[2].code, 'TH', 'Third country should be Thailand');

    // Ensure none of the top countries are duplicated in OTHER_COUNTRIES
    const topCodes = TOP_COUNTRIES.map(c => c.code);
    for (const other of OTHER_COUNTRIES) {
      assert.ok(!topCodes.includes(other.code), `Other countries should not include ${other.code}`);
    }
  });

  await t.test('getCountryFlag emoji generator', () => {
    assert.strictEqual(getCountryFlag('CA'), '🇨🇦');
    assert.strictEqual(getCountryFlag('US'), '🇺🇸');
    assert.strictEqual(getCountryFlag('TH'), '🇹🇭');
    assert.strictEqual(getCountryFlag('JP'), '🇯🇵');
    assert.strictEqual(getCountryFlag('GB'), '🇬🇧');
    assert.strictEqual(getCountryFlag(''), '');
    assert.strictEqual(getCountryFlag(null), '');
    assert.strictEqual(getCountryFlag('USA'), '');
  });

  await t.test('STATIC_HOLIDAYS contains 2025, 2026, 2027 datasets for CA, US, TH', () => {
    const countries = ['CA', 'US', 'TH'];
    const years = ['2025', '2026', '2027'];

    for (const code of countries) {
      assert.ok(STATIC_HOLIDAYS[code], `STATIC_HOLIDAYS should have ${code}`);
      for (const year of years) {
        assert.ok(STATIC_HOLIDAYS[code][year], `STATIC_HOLIDAYS should have ${code} for year ${year}`);
        const count = Object.keys(STATIC_HOLIDAYS[code][year]).length;
        assert.ok(count >= 10, `${code} ${year} should contain at least 10 holidays (got ${count})`);
      }
    }
  });

  await t.test('Verify Thailand lunar and statutory holidays in 2026', () => {
    const th2026 = STATIC_HOLIDAYS.TH['2026'];
    assert.ok(th2026['2026-01-01'], 'New Year\'s Day should exist');
    assert.ok(th2026['2026-03-03'], 'Makha Bucha Day should exist on 2026-03-03');
    assert.ok(th2026['2026-04-13'], 'Songkran should exist on 2026-04-13');
    assert.ok(th2026['2026-05-31'], 'Visakha Bucha Day should exist on 2026-05-31');
    assert.ok(th2026['2026-07-29'], 'Asahna Bucha Day should exist on 2026-07-29');
    assert.ok(th2026['2026-07-30'], 'Khao Phansa Day should exist on 2026-07-30');
    assert.ok(th2026['2026-10-13'], 'King Bhumibol Memorial Day should exist on 2026-10-13');
    assert.ok(th2026['2026-10-23'], 'Chulalongkorn Day should exist on 2026-10-23');
    assert.ok(th2026['2026-12-05'], 'National Day / Father\'s Day should exist on 2026-12-05');

    // Check bilingual name support
    assert.strictEqual(th2026['2026-10-13'].name, 'King Bhumibol Memorial Day');
    assert.strictEqual(th2026['2026-10-13'].localName, 'วันนวมินทรมหาราช');
  });

  await t.test('getHolidaysForYear static bundling resolution', async () => {
    const resTH = await getHolidaysForYear('TH', 2026);
    assert.ok(resTH['2026-10-13'], 'getHolidaysForYear should resolve TH 2026-10-13');

    const resUS = await getHolidaysForYear('US', 2026);
    assert.ok(resUS['2026-10-12'], 'getHolidaysForYear should resolve US 2026-10-12');

    const resEmpty = await getHolidaysForYear('', 2026);
    assert.deepStrictEqual(resEmpty, {}, 'Empty country code should return empty object');
  });
});
