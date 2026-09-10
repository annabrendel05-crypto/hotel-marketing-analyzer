import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import type { ScenarioConfig } from '../config.mts';
import { randomAt, hash } from '../random.mts';
import { generateGoogleAds, validateGoogleAds, summarizeGoogleAds, exportGoogleAds, googleCatalog, googleDateSegments } from '../google-ads.mts';
import { googleSchemas, googleTables, googleRow, validateGoogleRow, serializeGoogleTable, type GoogleData } from '../google-ads-schema.mts';

// Only a test date: the user must supply the actual generation configuration.
const fixture: ScenarioConfig = {
  scenario_id: 'baltic_horizon_2026_v1', scenario_version: '0.3', generator_version: 'foundation-v1',
  contract_version: '0.2', seed: '20260601', start_date: '2026-06-01', days: 90,
  hotel_id: 'hotel_demo_001', currency_code: 'PLN', timezone: 'Europe/Warsaw',
  tolerances: { relative: 0.02, percentage_points: 2 },
};
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const near = (actual: number, expected: number, relative = 0.02) => assert(Math.abs(actual - expected) <= expected * relative + 1e-7, `${actual} vs ${expected}`);
const micros = (data: GoogleData) => total(data.CampaignBasicStats_demo.map(r => r.metrics_cost_micros!));
const bytes = (data: GoogleData) => googleTables.map(t => serializeGoogleTable(t, data[t]));
const baseline = generateGoogleAds(fixture);

test('four DDL: exact ordinal fields, nullable types and exported keys; no canonical fields', async () => {
  const paths = ['003a_create_google_campaign_demo.sql', '003b_create_google_campaign_basic_stats_demo.sql',
    '003c_create_google_campaign_conversion_stats_demo.sql', '003d_create_google_customer_demo.sql'];
  for (const [i, table] of googleTables.entries()) {
    const ddl = await readFile(new URL(`../../ddl/${paths[i]}`, import.meta.url), 'utf8');
    const fields = [...ddl.matchAll(/^  (\w+) (INT64|STRING|FLOAT64|DATETIME|DATE|BOOL)([^\n]*)$/gm)];
    assert.equal(fields.length, [27, 17, 20, 9][i]);
    assert(fields.every(f => !f[3].includes('NOT NULL')));
    assert.deepEqual(Object.entries(googleSchemas[table]), fields.map(f => [f[1], f[2]]));
    const names = fields.map(f => f[1]);
    for (const row of baseline[table]) {
      assert.deepEqual(Object.keys(row), names);
      validateGoogleRow(table, row);
      for (const [, name, type] of fields) {
        const v = (row as unknown as Record<string, unknown>)[name];
        if (v === null) continue;
        assert.equal(typeof v, ['INT64', 'FLOAT64'].includes(type) ? 'number' : type === 'BOOL' ? 'boolean' : 'string');
        if (type === 'INT64') assert(Number.isSafeInteger(v));
      }
    }
    for (const line of serializeGoogleTable(table, baseline[table]).trim().split('\n')) assert.deepEqual(Object.keys(JSON.parse(line)), names);
    const nullable = googleRow(table, {});
    validateGoogleRow(table, nullable);
    assert(Object.values(nullable).every(v => v === null));
    assert.deepEqual(JSON.parse(serializeGoogleTable(table, [nullable])), nullable);
    assert.throws(() => validateGoogleRow(table, { ...nullable, hotel_id: 'extra' }));
    const incomplete = { ...nullable } as Record<string, unknown>; delete incomplete.customer_id;
    assert.throws(() => validateGoogleRow(table, incomplete));
    assert.throws(() => validateGoogleRow(table, { ...nullable, customer_id: Number.MAX_SAFE_INTEGER + 1 }));
    assert.throws(() => validateGoogleRow(table, { ...nullable, _DATA_DATE: '2026-02-30' }));
  }
});

test('deterministic records/order, independent RNG namespaces and no system-clock/random dependence', t => {
  const before = bytes(baseline), other = randomAt(fixture, 'profitroom:unrelated', 1);
  t.mock.timers.enable({ apis: ['Date'], now: 0 });
  t.mock.method(Math, 'random', () => { throw new Error('Unseeded randomness'); });
  assert.deepEqual(bytes(generateGoogleAds(fixture)), before);
  t.mock.timers.setTime(9000000000000);
  assert.deepEqual(bytes(generateGoogleAds(fixture)), before);
  for (let i = 0; i < 50; i++) randomAt(fixture, 'ga4:unrelated', i);
  assert.deepEqual(bytes(generateGoogleAds(fixture)), before);
  assert.equal(randomAt(fixture, 'profitroom:unrelated', 1), other);
  assert.notDeepEqual(bytes(generateGoogleAds({ ...fixture, seed: 'another-seed' })), before);
  assert.notDeepEqual(bytes(generateGoogleAds({ ...fixture, start_date: '2026-07-01' })), before);
});

// Independent assertions recompute totals from source rows, not the generator's summary.
function assertInvariants(c: ScenarioConfig, data: GoogleData) {
  const campaigns = data.Campaign_demo, customer = data.Customer_demo[0];
  const basic = data.CampaignBasicStats_demo, actions = data.CampaignConversionStats_demo;
  const start = Date.parse(`${c.start_date}T00:00:00Z`);
  const dates = Array.from({ length: 90 }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
  const last = dates.at(-1)!;
  assert.equal(data.Customer_demo.length, 1); assert.equal(campaigns.length, 3);
  assert.equal(basic.length, 540); assert.equal(actions.length, 1080);
  assert.equal(customer.customer_currency_code, 'PLN'); assert.equal(customer.customer_time_zone, 'Europe/Warsaw');
  assert.equal(customer.customer_manager, false); assert.equal(customer.customer_test_account, false);
  assert(Number.isSafeInteger(customer.customer_id)); assert(customer.customer_id! >= 100000000000000);
  assert.equal(customer._DATA_DATE, last);
  const ids = new Set(campaigns.map(r => r.campaign_id)); assert.equal(ids.size, 3);
  const campaignRoles = ['Search Generic', 'Brand', 'GHA'];
  const costs = micros(data);
  near(costs / 1e6, 24074); near(total(basic.map(r => r.metrics_impressions!)), 220693); near(total(basic.map(r => r.metrics_clicks!)), 11370);
  const totals = new Map<string, number[]>();
  for (const [i, role] of campaignRoles.entries()) {
    const camp = campaigns.find(r => r.campaign_name!.endsWith(`| ${role}`))!; assert(camp);
    assert(Number.isSafeInteger(camp.campaign_id)); assert(camp.campaign_id! >= 200000000000000);
    assert.equal(camp.campaign_advertising_channel_type, i === 2 ? 'HOTEL' : 'SEARCH');
    assert.equal(camp._DATA_DATE, last);
    assert.equal(camp.campaign_start_date_time, `${dates[0]}T00:00:00`);
    assert.equal(camp.campaign_end_date_time, `${last}T23:59:59`);
    const rows = basic.filter(r => r.campaign_id === camp.campaign_id);
    assert.deepEqual([...new Set(rows.map(r => r.segments_date))], dates);
    const campaignCost = total(rows.map(r => r.metrics_cost_micros!));
    assert(Math.abs(campaignCost / costs * 100 - [60, 35, 5][i]) <= 2);
  }
  const basicKeys = new Set(), actionKeys = new Set();
  for (const table of googleTables) for (const r of data[table]) {
    assert.equal(r.customer_id, customer.customer_id); assert.equal(r._LATEST_DATE, last);
    assert(dates.includes(r._DATA_DATE!));
    for (const [field, value] of Object.entries(r)) if (typeof value === 'number') assert(value >= 0, field);
  }
  for (const r of basic) {
    assert(ids.has(r.campaign_id)); assert(r.metrics_clicks! <= r.metrics_impressions!);
    assert.equal(r.metrics_interactions, r.metrics_clicks); assert.equal(r.metrics_view_through_conversions, 0);
    assert(Number.isSafeInteger(r.metrics_cost_micros)); assert.equal(r.metrics_cost_micros! % 10000, 0);
    assert.equal(r._DATA_DATE, r.segments_date);
    assert(['MOBILE', 'DESKTOP'].includes(r.segments_device!));
    const key = `${r.campaign_id}:${r.segments_date}`;
    assert(!basicKeys.has(`${key}:${r.segments_device}`)); basicKeys.add(`${key}:${r.segments_device}`);
    const v = totals.get(key) ?? [0, 0];
    totals.set(key, [v[0] + Math.round(r.metrics_conversions! * 100), v[1] + Math.round(r.metrics_conversions_value! * 100)]);
  }
  const conversionTotals = new Map<string, number[]>();
  for (const r of actions) {
    assert(ids.has(r.campaign_id)); assert.equal(r._DATA_DATE, r.segments_date);
    assert(r.segments_conversion_action!.startsWith(`customers/${customer.customer_id}/conversionActions/`));
    assert(r.segments_conversion_action_name!.startsWith('Demo Baltic —'));
    assert.equal(r.segments_conversion_attribution_event_type, 'INTERACTION');
    const count = r.metrics_conversions!, value = r.metrics_conversions_value!;
    assert.equal(r.metrics_value_per_conversion, count > 0 ? value / count : 0);
    if (r.segments_conversion_action_category !== 'PURCHASE' || count === 0) assert.equal(value, 0);
    const d = new Date(`${r.segments_date}T12:00:00Z`), week = new Date(`${r.segments_week}T12:00:00Z`);
    assert.equal(week.getUTCDay(), 1); assert(d.getTime() >= week.getTime() && d.getTime() - week.getTime() < 7 * 86400000);
    assert.equal(r.segments_month, r.segments_date!.slice(0, 7) + '-01');
    assert.equal(r.segments_year, d.getUTCFullYear());
    assert.equal(Number(r.segments_quarter!.slice(5, 7)), Math.floor(d.getUTCMonth() / 3) * 3 + 1);
    const key = `${r.campaign_id}:${r.segments_date}`;
    assert(!actionKeys.has(`${key}:${r.segments_conversion_action}`)); actionKeys.add(`${key}:${r.segments_conversion_action}`);
    const v = conversionTotals.get(key) ?? [0, 0];
    conversionTotals.set(key, [v[0] + Math.round(count * 100), v[1] + Math.round(value * 100)]);
  }
  assert.deepEqual(conversionTotals, totals);
  const categories = ['PAGE_VIEW', 'ADD_TO_CART', 'BEGIN_CHECKOUT', 'PURCHASE'];
  assert.deepEqual(new Set(actions.map(r => r.segments_conversion_action_category)), new Set(categories));
  assert.equal(new Set(actions.map(r => r.segments_conversion_action)).size, 4);
  categories.forEach((cat, i) => {
    const rows = actions.filter(r => r.segments_conversion_action_category === cat);
    assert.equal(rows.length, 270);
    near(total(rows.map(r => Math.round(r.metrics_conversions! * 100))) / 100, [4411, 234, 63, 10][i]);
    if (cat === 'PURCHASE') near(total(rows.map(r => Math.round(r.metrics_conversions_value! * 100))) / 100, 53707);
    else assert(rows.every(r => r.metrics_conversions_value === 0));
  });
  assert(actions.some(r => !Number.isInteger(r.metrics_conversions))); // Fractional credit is actually exercised.
  const dailySpend = dates.map(d => total(basic.filter(r => r.segments_date === d).map(r => r.metrics_cost_micros!)));
  assert(new Set(dailySpend).size > 80); // No repeated template or last-day correction spike.
  assert(Math.max(...dailySpend) < costs / 90 * 2.5);
  assert(dailySpend.at(-1)! < costs / 90 * 2.5);
  assert(actions.some(r => r.segments_conversion_action_category === 'PURCHASE' && r.metrics_conversions! > 0 &&
    actions.some(s => s.campaign_id === r.campaign_id && s.segments_date === r.segments_date && s.segments_conversion_action_category === 'BEGIN_CHECKOUT' && s.metrics_conversions === 0)));
}

test('fixture reconciles deliveries, four actions, currency, micros, target mix and snapshots', () => {
  assertInvariants(fixture, baseline);
  const summary = summarizeGoogleAds(baseline);
  assert.equal(summary.cost_micros, micros(baseline));
  assert.equal(summary.actions.find(a => a.key === 'purchase')!.value_pln,
    total(baseline.CampaignConversionStats_demo.map(r => Math.round(r.metrics_conversions_value! * 100))) / 100);
});

test('100 seeds: independent schema, identity, calendar, calibration and credit/value invariants', () => {
  const ids = new Set<number>(), costs = new Set<number>();
  const starts = ['2026-06-01', '2026-03-01', '2026-09-01', '2026-12-01', '2024-02-01'];
  for (let i = 0; i < 100; i++) {
    const c = { ...fixture, seed: `audit-${i}`, start_date: starts[i % starts.length] };
    const data = generateGoogleAds(c); assertInvariants(c, data); validateGoogleAds(c, data);
    for (const id of [data.Customer_demo[0].customer_id!, ...data.Campaign_demo.map(r => r.campaign_id!)]) {
      assert(!ids.has(id)); ids.add(id);
    }
    costs.add(micros(data));
  }
  assert.equal(ids.size, 400); assert(costs.size > 90);
});

test('source validator accepts NULL but rejects wrong types; baseline rejects broken joins, dates, zeros and totals', () => {
  assert.throws(() => validateGoogleRow('Campaign_demo', { ...baseline.Campaign_demo[0], campaign_start_date_time: '2026-06-01T24:00:00' }));
  assert.throws(() => validateGoogleRow('Customer_demo', { ...baseline.Customer_demo[0], customer_manager: 'false' }));
  assert.throws(() => validateGoogleRow('CampaignBasicStats_demo', { ...baseline.CampaignBasicStats_demo[0], metrics_conversions: NaN }));
  const mutations: ((d: GoogleData) => void)[] = [
    d => { d.Campaign_demo[0].campaign_id = d.Campaign_demo[1].campaign_id; },
    d => { d.Customer_demo[0].customer_currency_code = 'EUR'; },
    d => { d.CampaignBasicStats_demo[0].customer_id = 1; },
    d => { d.CampaignBasicStats_demo[0].campaign_id = 1; },
    d => { d.CampaignBasicStats_demo[0].metrics_cost_micros = -1; },
    d => { d.CampaignBasicStats_demo[0].metrics_cost_micros! += 1; },
    d => { d.CampaignBasicStats_demo[0].metrics_impressions = 0; },
    d => { d.CampaignBasicStats_demo[0].metrics_conversions = null; },
    d => { d.CampaignBasicStats_demo[0].metrics_conversions! += 1; },
    d => { d.CampaignBasicStats_demo[0]._LATEST_DATE = '2026-08-28'; },
    d => { d.CampaignConversionStats_demo[0].segments_date = '2026-02-30'; },
    d => { d.CampaignConversionStats_demo[0].segments_conversion_action_name = 'wrong'; },
    d => { d.CampaignConversionStats_demo[0].segments_week = '2026-06-02'; },
    d => { d.CampaignConversionStats_demo[0].metrics_value_per_conversion = 99; },
    d => { d.CampaignConversionStats_demo.find(r => r.segments_conversion_action_category !== 'PURCHASE')!.metrics_conversions_value = 1; },
    d => { d.CampaignConversionStats_demo.find(r => r.segments_conversion_action_category === 'PURCHASE' && r.metrics_conversions === 0)!.metrics_conversions_value = 1; },
    d => { d.CampaignBasicStats_demo[0] = d.CampaignBasicStats_demo[1]; },
  ];
  for (const mutate of mutations) { const d = structuredClone(baseline); mutate(d); assert.throws(() => validateGoogleAds(fixture, d)); }
  assert.throws(() => generateGoogleAds({ ...fixture, start_date: '' }));
  assert.throws(() => generateGoogleAds({ ...fixture, days: 89 } as unknown as ScenarioConfig));
});

test('first supported year, leap day and DST produce local dates and Monday-based weeks', () => {
  assert.equal(googleDateSegments('2000-01-01').segments_week, '1999-12-27');
  assert.equal(googleDateSegments('2024-02-29').segments_week, '2024-02-26');
  assert.equal(googleDateSegments('2026-03-29').segments_day_of_week, 'SUNDAY');
  assert.equal(googleDateSegments('2026-10-25').segments_day_of_week, 'SUNDAY');
  const c = { ...fixture, start_date: '2000-01-01' };
  assertInvariants(c, generateGoogleAds(c));
});

test('local export repeats four NDJSON artifacts and manifest byte-for-byte; never overwrites', async t => {
  const root = await mkdtemp(join(tmpdir(), 'google-ads-test-'));
  try {
    const dir = join(root, 'first'), second = join(root, 'second');
    const manifest = await exportGoogleAds(fixture, dir);
    t.mock.timers.enable({ apis: ['Date'], now: 9999999999999 });
    const repeated = await exportGoogleAds(fixture, second);
    assert.deepEqual(manifest, repeated);
    assert.equal(manifest.artifacts.length, 4); assert.equal(manifest.tables.length, 4);
    assert.equal(manifest.config_hash, hash(fixture));
    assert.equal(manifest.generated_at, '2026-08-30T06:00:00.000Z');
    for (const table of googleTables) {
      const path = `${table}.ndjson`, content = await readFile(join(dir, path));
      assert.deepEqual(content, await readFile(join(second, path)));
      assert.deepEqual(content.toString().trim().split('\n').map(line => JSON.parse(line)), baseline[table]);
      const a = manifest.artifacts.find(a => a.path === path)!;
      assert.equal(a.bytes, content.byteLength);
      assert.equal(a.sha256, createHash('sha256').update(content).digest('hex'));
    }
    const saved = await readFile(join(dir, 'manifest.json'));
    assert.deepEqual(JSON.parse(saved.toString()), manifest);
    assert.deepEqual(await readFile(join(second, 'manifest.json')), saved);
    await assert.rejects(exportGoogleAds(fixture, dir), { code: 'EEXIST' });
    assert.deepEqual(await readFile(join(dir, 'manifest.json')), saved);
    assert.equal(manifest.catalog.customerId, googleCatalog(fixture).customerId);
  } finally { await rm(root, { recursive: true, force: true }); }
});
