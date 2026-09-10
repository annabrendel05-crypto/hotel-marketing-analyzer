import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ScenarioConfig, validateConfig, validateDate } from './config.mts';
import { hash, randomAt, syntheticId } from './random.mts';
import { calendar, scenarioAsOf } from './time.mts';
import { sourceWeights } from './signals.mts';
import { largestRemainder, allocateMoney, allocatePurchaseValues, withinTolerance, withinShareTolerance, assertUnique } from './allocation.mts';
import { buildManifest, describeArtifact, serializeManifest } from './manifest.mts';
import { googleSchemas, googleTables, googleRow, validateGoogleRow, serializeGoogleTable, type GoogleData, type GoogleRow } from './google-ads-schema.mts';

export const GOOGLE_ADS_VERSION = 'google-ads-source-demo-generator-v1';
export const googleTargets = {
  cost: 24074, impressions: 220693, clicks: 11370,
  step1: 4411, step2: 234, step3: 63, purchase: 10, purchaseValue: 53707,
} as const;
export const campaignRoles = ['Search Generic', 'Brand', 'GHA'] as const;
export const actionSpecs = [
  { key: 'step1', name: 'Demo Baltic — wybór terminu', category: 'PAGE_VIEW', cells: 270, shares: [0.35, 0.57, 0.08] },
  { key: 'step2', name: 'Demo Baltic — wybór dodatków', category: 'ADD_TO_CART', cells: 90, shares: [0.13, 0.59, 0.28] },
  { key: 'step3', name: 'Demo Baltic — podsumowanie pobytu', category: 'BEGIN_CHECKOUT', cells: 42, shares: [0.06, 0.69, 0.25] },
  { key: 'purchase', name: 'Demo Baltic — zakup online', category: 'PURCHASE', cells: 12, shares: [0.06, 0.88, 0.06] },
] as const;
const devices = ['MOBILE', 'DESKTOP'] as const;
const costShares = [60, 35, 5] as const;
const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
function units(value: number, scale: number): number {
  const n = Math.round(value * scale);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(n) || Math.abs(value * scale - n) > 0.00001) {
    throw new Error('Invalid fixed precision metric');
  }
  return n;
}
// Disjoint number ranges by kind/index, all exactly representable in JSON/INT64.
function intId(c: ScenarioConfig, kind: 'customer' | 'campaign' | 'account', index: number): number {
  const base = { customer: 100000000000000, campaign: 200000000000000, account: 400000000000000 }[kind];
  return base + index * 2 ** 44 + Number.parseInt(hash(syntheticId(c, kind, GOOGLE_ADS_VERSION, index)).slice(0, 11), 16);
}
export function googleCatalog(c: ScenarioConfig) {
  validateConfig(c);
  const customerId = intId(c, 'customer', 0);
  return {
    customerId,
    campaigns: campaignRoles.map((role, i) => ({ role, id: intId(c, 'campaign', i),
      name: `Demo Baltic Horizon | ${role}`, channel: i === 2 ? 'HOTEL' : 'SEARCH',
      resource: `customers/${customerId}/campaigns/${intId(c, 'campaign', i)}` })),
    actions: actionSpecs.map((a, i) => ({ ...a,
      resource: `customers/${customerId}/conversionActions/${intId(c, 'account', i)}` })),
  };
}
export function googleDateSegments(date: string) {
  validateDate(date);
  const d = new Date(`${date}T12:00:00Z`), month = d.getUTCMonth();
  return { segments_day_of_week: weekdays[d.getUTCDay()], segments_month: date.slice(0, 7) + '-01',
    segments_quarter: `${date.slice(0, 4)}-${String(Math.floor(month / 3) * 3 + 1).padStart(2, '0')}-01`,
    segments_week: new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10), segments_year: d.getUTCFullYear() };
}

export function generateGoogleAds(c: ScenarioConfig): GoogleData {
  validateConfig(c);
  const days = calendar(c), latest = days.at(-1)!, catalog = googleCatalog(c);
  const rng = (key: string) => randomAt(c, GOOGLE_ADS_VERSION, key);
  // Sample scenario pools within G02; allocation conserves these sampled pools,
  // not the exact reference targets. No correction of results already in tolerance.
  const pool = (target: number, scale: number, key: string) => Math.round(target * scale * (0.99 + rng(`pool:${key}`) * 0.02));
  const daily = catalog.campaigns.map((_, i) => sourceWeights(c, `google_ads:${i}`));
  const cells = days.flatMap((date, di) => catalog.campaigns.map((camp, ci) => ({
    key: `${date}:${camp.id}`, date, di, ci, weight: daily[ci][di],
  })));
  const byRole = (total: number, shares: readonly number[], key: string, capacity?: readonly number[]) => {
    const counts = largestRemainder(total, catalog.campaigns.map((camp, i) => ({
      key: String(camp.id), weight: shares[i] * (0.99 + rng(`${key}:role:${i}`) * 0.02),
      ...(capacity ? { capacity: sum(cells.map((cell, j) => cell.ci === i ? capacity[j] : 0)) } : {}),
    })));
    const result = cells.map(() => 0);
    counts.forEach((count, ci) => {
      const indices = cells.map((cell, i) => ({ cell, i })).filter(x => x.cell.ci === ci);
      const values = largestRemainder(count, indices.map(({ cell, i }) => ({ key: cell.key,
        weight: cell.weight * (0.8 + rng(`${key}:${cell.key}`) * 0.4),
        ...(capacity ? { capacity: capacity[i] } : {}),
      })));
      indices.forEach(({ i }, j) => { result[i] = values[j]; });
    });
    return result;
  };
  const impressions = byRole(pool(googleTargets.impressions, 1, 'impressions'), [0.81, 0.14, 0.05], 'impressions');
  const clicks = byRole(pool(googleTargets.clicks, 1, 'clicks'), [0.58, 0.38, 0.04], 'clicks', impressions);
  const costCents = byRole(pool(googleTargets.cost, 100, 'cost'), costShares, 'cost');

  // Independent eligible cells per action: aggregate proportions are not a session funnel.
  // All 270 daily campaign/action slots exist before allocation; no filler rows.
  const credits = catalog.actions.map(action => {
    const weights = cells.map(cell => cell.weight * action.shares[cell.ci] * (0.6 + rng(`${action.key}:weight:${cell.key}`) * 0.8));
    const selected = new Set(cells.map((cell, i) => ({ i,
      rank: -Math.log(1 - rng(`${action.key}:eligibility:${cell.key}`)) / weights[i],
    })).sort((a, b) => a.rank - b.rank || a.i - b.i).slice(0, action.cells).map(x => x.i));
    return largestRemainder(pool(googleTargets[action.key], 100, action.key), cells.map((cell, i) => ({
      key: cell.key, weight: weights[i], allowed: selected.has(i),
    })));
  });
  const purchaseCredits = credits[3];
  const purchaseValues = allocatePurchaseValues(pool(googleTargets.purchaseValue, 100, 'purchaseValue'), cells.map((cell, i) => ({
    key: cell.key, purchases: purchaseCredits[i] / 100, valueMeasured: true,
    weight: purchaseCredits[i] * (0.8 + rng(`purchase-price:${cell.key}`) * 0.4),
  }))).map(v => units(Number(v), 100));

  const data: GoogleData = { Campaign_demo: [], CampaignBasicStats_demo: [], CampaignConversionStats_demo: [], Customer_demo: [] };
  data.Customer_demo.push(googleRow('Customer_demo', {
    customer_id: catalog.customerId, customer_auto_tagging_enabled: true, customer_currency_code: c.currency_code,
    customer_descriptive_name: 'Hotel Baltic Horizon Demo — konto reklamowe', customer_manager: false,
    customer_test_account: false, customer_time_zone: c.timezone, _LATEST_DATE: latest, _DATA_DATE: latest,
  }));
  catalog.campaigns.forEach((camp, ci) => {
    const averageMicros = Math.round(sum(costCents.filter((_, i) => cells[i].ci === ci)) * 10000 / c.days);
    data.Campaign_demo.push(googleRow('Campaign_demo', {
      campaign_id: camp.id, customer_id: catalog.customerId, campaign_name: camp.name,
      campaign_advertising_channel_type: camp.channel, campaign_advertising_channel_sub_type: null,
      campaign_bidding_strategy_type: 'MANUAL_CPC', campaign_budget_amount_micros: averageMicros,
      campaign_budget_explicitly_shared: false, campaign_budget_has_recommended_budget: false,
      campaign_budget_period: 'DAILY', campaign_campaign_budget: `customers/${catalog.customerId}/campaignBudgets/${camp.id}`,
      campaign_start_date_time: `${days[0]}T00:00:00`, campaign_end_date_time: `${latest}T23:59:59`,
      campaign_experiment_type: 'BASE', campaign_manual_cpc_enhanced_cpc_enabled: false,
      campaign_serving_status: 'SERVING', campaign_status: 'ENABLED', _LATEST_DATE: latest, _DATA_DATE: latest,
    }));
  });
  cells.forEach((cell, i) => {
    const camp = catalog.campaigns[cell.ci];
    const common = { campaign_id: camp.id, customer_id: catalog.customerId, campaign_base_campaign: camp.resource,
      segments_ad_network_type: 'SEARCH', segments_date: cell.date, segments_slot: 'SEARCH',
      _LATEST_DATE: latest, _DATA_DATE: cell.date };
    const deviceCells = devices.map((key, d) => ({ key,
      weight: d === 0 ? 0.72 + rng(`mobile:${cell.key}`) * 0.12 : 0.28 - rng(`mobile:${cell.key}`) * 0.12 }));
    const deviceImpressions = largestRemainder(impressions[i], deviceCells);
    const deviceClicks = largestRemainder(clicks[i], deviceCells.map((d, j) => ({ ...d, capacity: deviceImpressions[j] })));
    const deviceCost = allocateMoney(costCents[i], deviceCells).map(v => units(Number(v), 100) * 10000);
    const deviceCredit = credits.map(action => largestRemainder(action[i], deviceCells));
    const deviceValue = allocatePurchaseValues(purchaseValues[i], deviceCells.map((d, j) => ({
      ...d, weight: deviceCredit[3][j], purchases: deviceCredit[3][j] / 100, valueMeasured: true,
    }))).map(v => Number(v));
    devices.forEach((device, j) => {
      data.CampaignBasicStats_demo.push(googleRow('CampaignBasicStats_demo', { ...common,
        metrics_clicks: deviceClicks[j], metrics_impressions: deviceImpressions[j], metrics_cost_micros: deviceCost[j],
        metrics_interactions: deviceClicks[j], metrics_interaction_event_types: 'CLICK', metrics_view_through_conversions: 0,
        metrics_conversions: sum(deviceCredit.map(a => a[j])) / 100, metrics_conversions_value: deviceValue[j], segments_device: device,
      }));
    });
    catalog.actions.forEach((action, ai) => {
      const credit = credits[ai][i] / 100, value = ai === 3 ? purchaseValues[i] / 100 : 0;
      data.CampaignConversionStats_demo.push(googleRow('CampaignConversionStats_demo', { ...common, ...googleDateSegments(cell.date),
        segments_conversion_action: action.resource, segments_conversion_action_category: action.category,
        segments_conversion_action_name: action.name, segments_conversion_attribution_event_type: 'INTERACTION',
        metrics_conversions: credit, metrics_conversions_value: value,
        metrics_value_per_conversion: credit > 0 ? value / credit : 0,
      }));
    });
  });
  // Locale-independent ordering; schema ordinal ordering is handled by the serializer.
  data.Campaign_demo.sort((a, b) => a.campaign_id! - b.campaign_id!);
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  data.CampaignBasicStats_demo.sort((a, b) => compare(a.segments_date!, b.segments_date!) || a.campaign_id! - b.campaign_id! || compare(a.segments_device!, b.segments_device!));
  data.CampaignConversionStats_demo.sort((a, b) => compare(a.segments_date!, b.segments_date!) || a.campaign_id! - b.campaign_id! || compare(a.segments_conversion_action!, b.segments_conversion_action!));
  validateGoogleAds(c, data);
  return data;
}

export function summarizeGoogleAds(data: GoogleData) {
  const basic = data.CampaignBasicStats_demo;
  const micros = sum(basic.map(r => r.metrics_cost_micros!));
  return {
    rows: Object.fromEntries(googleTables.map(t => [t, data[t].length])),
    cost_micros: micros, cost_pln: micros / 1000000,
    impressions: sum(basic.map(r => r.metrics_impressions!)), clicks: sum(basic.map(r => r.metrics_clicks!)),
    campaigns: data.Campaign_demo.map(c => {
      const cost = sum(basic.filter(r => r.campaign_id === c.campaign_id).map(r => r.metrics_cost_micros!));
      return { campaign_id: c.campaign_id, name: c.campaign_name, cost_pln: cost / 1000000, share_pct: cost / micros * 100 };
    }),
    actions: actionSpecs.map(a => {
      const rows = data.CampaignConversionStats_demo.filter(r => r.segments_conversion_action_name === a.name);
      return { key: a.key, name: a.name,
        conversions: sum(rows.map(r => units(r.metrics_conversions!, 100))) / 100,
        value_pln: sum(rows.map(r => units(r.metrics_conversions_value!, 100))) / 100 };
    }),
  };
}

// Baseline demo invariants are stronger than the nullable source schema.
export function validateGoogleAds(c: ScenarioConfig, data: GoogleData): void {
  validateConfig(c);
  if (Object.keys(data).length !== 4 || googleTables.some(t => !Array.isArray(data[t]))) throw new Error('Expected four tables');
  for (const table of googleTables) data[table].forEach(r => validateGoogleRow(table, r));
  const days = calendar(c), latest = days.at(-1)!, cat = googleCatalog(c);
  if (data.Customer_demo.length !== 1 || data.Campaign_demo.length !== 3 || data.CampaignBasicStats_demo.length !== 540 || data.CampaignConversionStats_demo.length !== 1080) throw new Error('Incomplete baseline tables');
  const customer = data.Customer_demo[0];
  if (customer.customer_id !== cat.customerId || customer.customer_currency_code !== c.currency_code || customer.customer_time_zone !== c.timezone ||
      customer.customer_manager !== false || customer.customer_test_account !== false) throw new Error('Invalid customer');
  assertUnique(data.Campaign_demo.map(r => String(r.campaign_id)));
  const requiredNumber = (v: number | null) => { if (v === null || !Number.isFinite(v) || v < 0) throw new Error('Missing or negative metric'); return v; };
  for (const table of googleTables) for (const r of data[table]) {
    if (r.customer_id !== cat.customerId || r._LATEST_DATE !== latest || r._DATA_DATE === null || !days.includes(r._DATA_DATE)) throw new Error('Invalid identity or snapshot');
  }
  if (customer._DATA_DATE !== latest) throw new Error('Invalid customer snapshot');
  for (const r of data.Campaign_demo) {
    const camp = cat.campaigns.find(a => a.id === r.campaign_id);
    if (!camp || camp.name !== r.campaign_name || camp.channel !== r.campaign_advertising_channel_type || r._DATA_DATE !== latest ||
        r.campaign_start_date_time !== `${days[0]}T00:00:00` || r.campaign_end_date_time !== `${latest}T23:59:59`) throw new Error('Invalid campaign');
    requiredNumber(r.campaign_budget_amount_micros);
  }
  const baseKeys: string[] = [], conversionKeys: string[] = [];
  const basicTotals = new Map<string, number[]>(), actionTotals = new Map<string, number[]>();
  const add = (map: Map<string, number[]>, key: string, credit: number, value: number) => {
    const old = map.get(key) ?? [0, 0]; map.set(key, [old[0] + units(credit, 100), old[1] + units(value, 100)]);
  };
  const checkCommon = (r: GoogleRow<'CampaignBasicStats_demo'> | GoogleRow<'CampaignConversionStats_demo'>) => {
    const camp = cat.campaigns.find(a => a.id === r.campaign_id);
    if (!camp || r.campaign_base_campaign !== camp.resource || r.segments_date !== r._DATA_DATE || r.segments_slot !== 'SEARCH' || r.segments_ad_network_type !== 'SEARCH') throw new Error('Invalid source dimensions');
    requiredNumber(r.metrics_conversions); requiredNumber(r.metrics_conversions_value);
    return `${r.segments_date}:${r.campaign_id}`;
  };
  for (const r of data.CampaignBasicStats_demo) {
    const key = checkCommon(r);
    if (!devices.some(d => d === r.segments_device)) throw new Error('Invalid device');
    baseKeys.push(`${key}:${r.segments_device}`);
    const cost = requiredNumber(r.metrics_cost_micros), clicks = requiredNumber(r.metrics_clicks), imp = requiredNumber(r.metrics_impressions);
    if (clicks > imp || r.metrics_interactions !== clicks || (cost > 0 && imp === 0) || cost % 10000 !== 0 || r.metrics_view_through_conversions !== 0) throw new Error('Invalid delivery');
    add(basicTotals, key, r.metrics_conversions!, r.metrics_conversions_value!);
  }
  for (const r of data.CampaignConversionStats_demo) {
    const key = checkCommon(r), action = cat.actions.find(a => a.resource === r.segments_conversion_action);
    if (!action || action.name !== r.segments_conversion_action_name || action.category !== r.segments_conversion_action_category || r.segments_conversion_attribution_event_type !== 'INTERACTION') throw new Error('Invalid action');
    conversionKeys.push(`${key}:${action.key}`);
    const count = r.metrics_conversions!, value = r.metrics_conversions_value!;
    requiredNumber(r.metrics_value_per_conversion);
    if ((action.key !== 'purchase' || count === 0) && value !== 0) throw new Error('Value requires purchase credit');
    if (Math.abs(r.metrics_value_per_conversion! - (count > 0 ? value / count : 0)) > 1e-8) throw new Error('Invalid value per conversion');
    for (const [field, value] of Object.entries(googleDateSegments(r.segments_date!))) {
      if (r[field as keyof typeof r] !== value) throw new Error('Invalid date segment');
    }
    add(actionTotals, key, count, value);
  }
  assertUnique(baseKeys); assertUnique(conversionKeys);
  if (basicTotals.size !== 270 || actionTotals.size !== 270) throw new Error('Missing campaign days');
  for (const [key, b] of basicTotals) {
    const a = actionTotals.get(key);
    if (!a || a[0] !== b[0] || a[1] !== b[1]) throw new Error('BasicStats/action mismatch');
  }
  const s = summarizeGoogleAds(data);
  for (const [actual, target] of [[s.cost_pln, googleTargets.cost], [s.impressions, googleTargets.impressions], [s.clicks, googleTargets.clicks]]) {
    if (!withinTolerance(actual, target, c.tolerances.relative)) throw new Error('Outside calibration');
  }
  cat.campaigns.forEach((camp, i) => {
    const part = s.campaigns.find(r => r.campaign_id === camp.id)!;
    if (!withinShareTolerance(part.share_pct, costShares[i], c.tolerances.percentage_points)) throw new Error('Outside cost mix');
  });
  for (const a of s.actions) {
    if (!withinTolerance(a.conversions, googleTargets[a.key], c.tolerances.relative)) throw new Error('Outside action target');
    if (a.key === 'purchase' && !withinTolerance(a.value_pln, googleTargets.purchaseValue, c.tolerances.relative)) throw new Error('Outside purchase value target');
  }
}

export async function exportGoogleAds(c: ScenarioConfig, directory: string) {
  const data = generateGoogleAds(c);
  const files = googleTables.map(table => ({ table, path: `${table}.ndjson`, content: serializeGoogleTable(table, data[table]) }));
  const manifest = { ...buildManifest(c, files.map(f => describeArtifact(f.path, Buffer.from(f.content)))),
    source_generator_version: GOOGLE_ADS_VERSION, source_schema_hash: hash(googleSchemas),
    snapshot_as_of_at: scenarioAsOf(c), catalog: googleCatalog(c), summary: summarizeGoogleAds(data),
    tables: files.map(f => ({ path: f.path, table: `google_ads.${f.table}` })),
    policy: { version: 'google-ads-reporting-v1', date_basis: 'interaction_date',
      attribution: 'synthetic_fractional_credit_0.01', window_days: null,
      basic_stats_conversions: 'sum_of_four_generated_actions_included_in_conversions',
      phone_actions: 'not_generated_no_complete_calibration',
      data_date: 'stats: reporting day; dimensions: last reporting day', latest_date: 'last reporting day',
      generated_runtime: process.versions.node },
  };
  // Explicit local destination, new directory only. A manifest is written last.
  // No G08/upload policy; existing directories are never replaced.
  await mkdir(directory);
  for (const f of files) await writeFile(join(directory, f.path), f.content, { flag: 'wx' });
  await writeFile(join(directory, 'manifest.json'), serializeManifest(manifest), { flag: 'wx' });
  return manifest;
}
