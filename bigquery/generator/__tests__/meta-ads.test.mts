import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ScenarioConfig } from '../config.mts';
import { generateMetaAds, summarizeMetaAds, validateMetaAds } from '../meta-ads.mts';
import { metaSchemas, metaTables, metaRow, validateMetaRow, serializeMetaTable } from '../meta-ads-schema.mts';

// Explicit test fixture only, not a production start_date decision.
const fixture: ScenarioConfig = {
  scenario_id: 'baltic_horizon_2026_v1', scenario_version: '0.3', generator_version: 'foundation-v1',
  contract_version: '0.2', seed: '20260601', start_date: '2026-06-01', days: 90,
  hotel_id: 'hotel_demo_001', currency_code: 'PLN', timezone: 'Europe/Warsaw',
  tolerances: { relative: 0.02, percentage_points: 2 },
};
const data = generateMetaAds(fixture);

test('Meta baseline runs for 90 days, two campaigns and calibrated actions', () => {
  validateMetaAds(fixture, data);
  const s = summarizeMetaAds(data);
  assert.deepEqual(s.rows, { AdCreatives_demo: 4, AdInsights_demo: 360, AdInsightsActions_demo: 2520, Ads_demo: 4 });
  assert.equal(new Set(data.AdInsights_demo.map(r => r.DateStart)).size, 90);
  assert.equal(new Set(data.AdInsights_demo.map(r => r.CampaignId)).size, 2);
  assert(data.AdInsights_demo.some(r => r.CampaignName!.includes('prospecting')));
  assert(data.AdInsights_demo.some(r => r.CampaignName!.includes('remarketing')));
  const targets = { spend: 30951.36, impressions: 1843578, clicks: 98442, link_clicks: 36576,
    landing_page_views: 32796, search: 16902, add_to_cart: 450, initiate_checkout: 72,
    purchases: 18, purchase_value: 28008 };
  for (const key of Object.keys(targets) as (keyof typeof targets)[]) {
    assert(Math.abs(s[key] - targets[key]) <= targets[key] * 0.02, key);
  }
  assert(data.AdInsightsActions_demo.some(r => r.ActionCollection === 'ActionValues' && r.ActionValue! > 0));
});

test('Meta source columns, types, order and nullable match all four DDL; JSON survives export', async () => {
  const slugs = ['ad_creatives', 'ad_insights', 'ad_insights_actions', 'ads'];
  for (const [i, table] of metaTables.entries()) {
    const ddl = await readFile(new URL(`../../ddl/002${'abcd'[i]}_create_meta_${slugs[i]}_demo.sql`, import.meta.url), 'utf8');
    const fields = [...ddl.matchAll(/^  (\w+) (STRING|DATE|TIMESTAMP|BIGNUMERIC|FLOAT64|INT64|BOOL|JSON)([^\n]*)$/gm)];
    assert.equal(fields.length, [31, 65, 27, 23][i]);
    assert(fields.every(f => !f[3].includes('NOT NULL')));
    assert.deepEqual(Object.entries(metaSchemas[table]), fields.map(f => [f[1], f[2]]));
    for (const row of data[table]) {
      assert.deepEqual(Object.keys(row), fields.map(f => f[1]));
      validateMetaRow(table, row);
    }
    const restored = serializeMetaTable(table, data[table]).trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(restored, data[table]);
    assert(restored.every(r => !Object.hasOwn(r, '_PARTITIONTIME')));
    const empty = metaRow(table, {});
    validateMetaRow(table, empty);
    assert(Object.values(empty).every(v => v === null));
    assert.throws(() => validateMetaRow(table, { ...empty, scenario_id: 'extra' }));
  }
  const creative = JSON.parse(serializeMetaTable('AdCreatives_demo', [data.AdCreatives_demo[0]]));
  assert.equal(creative.ObjectStorySpecLinkData.call_to_action.value.link, creative.LinkUrl);
  assert.equal(typeof data.AdInsights_demo[0].Spend, 'string');
  assert.throws(() => validateMetaRow('AdInsights_demo', { ...data.AdInsights_demo[0], Spend: 123 }));
});

test('Meta records and serialized content repeat with seed/config and ignore system clock', t => {
  const serialize = (d: typeof data) => metaTables.map(table => serializeMetaTable(table, d[table]));
  const before = serialize(data);
  t.mock.timers.enable({ apis: ['Date'], now: 0 });
  t.mock.method(Math, 'random', () => { throw new Error('Unseeded randomness'); });
  assert.deepEqual(serialize(generateMetaAds(fixture)), before);
  t.mock.timers.setTime(9999999999999);
  assert.deepEqual(serialize(generateMetaAds(fixture)), before);
  assert.notDeepEqual(serialize(generateMetaAds({ ...fixture, seed: 'another-seed' })), before);
});
