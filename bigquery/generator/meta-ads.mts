import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ScenarioConfig, validateConfig } from './config.mts';
import { hash, randomAt, syntheticId } from './random.mts';
import { calendar, warsawTimestamp, scenarioAsOf } from './time.mts';
import { sourceWeights } from './signals.mts';
import { allocateMoney, allocatePurchaseValues, largestRemainder, withinTolerance, assertUnique } from './allocation.mts';
import { buildManifest, describeArtifact, serializeManifest } from './manifest.mts';
import { metaSchemas, metaTables, metaRow, validateMetaRow, serializeMetaTable, type MetaData, type MetaRow, type MetaTable } from './meta-ads-schema.mts';

export const META_ADS_VERSION = 'meta-ads-source-demo-generator-v1';
export const metaTargets = {
  spend: 30951.36, impressions: 1843578, clicks: 98442, link_clicks: 36576,
  landing_page_views: 32796, search: 16902, add_to_cart: 450, initiate_checkout: 72,
  purchases: 18, purchase_value: 28008,
} as const;
export const metaActions = [
  { key: 'link_clicks', type: 'link_click' },
  { key: 'landing_page_views', type: 'landing_page_view' },
  { key: 'search', type: 'offsite_conversion.fb_pixel_search' },
  { key: 'add_to_cart', type: 'offsite_conversion.fb_pixel_add_to_cart' },
  { key: 'initiate_checkout', type: 'offsite_conversion.fb_pixel_initiate_checkout' },
  { key: 'purchases', type: 'offsite_conversion.fb_pixel_purchase' },
] as const;
const purchaseType = metaActions[5].type;
const attribution = '["7d_click"]';
const accountName = 'Hotel Baltic Horizon Demo — Meta';
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
export function metaUnits(value: number | string | null, scale = 100): number {
  if (value === null || (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value))) throw new Error('Missing or invalid numeric measurement');
  const n = Number(value), units = Math.round(n * scale);
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(units) || Math.abs(n * scale - units) > 0.000001) throw new Error('Invalid metric precision');
  return units;
}
// Half-up at six decimal places, using integer arithmetic. Zero denominator is unknown.
export function metaRatio(numerator: number, denominator: number): string | null {
  if (![numerator, denominator].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Invalid ratio');
  if (!denominator) return null;
  const n = (BigInt(numerator) * 1000000n * 2n + BigInt(denominator)) / (2n * BigInt(denominator));
  return `${n / 1000000n}.${String(n % 1000000n).padStart(6, '0')}`;
}
export function metaCatalog(c: ScenarioConfig) {
  validateConfig(c);
  const id = (kind: string, i: number) => `demo_${kind}_${hash(syntheticId(c, 'campaign', `${META_ADS_VERSION}:${kind}`, i)).slice(0, 24)}`;
  const accountId = syntheticId(c, 'account', META_ADS_VERSION, 0);
  const campaigns = (['prospecting', 'remarketing'] as const).map((role, ci) => ({
    id: id('campaign', ci), role, name: `Demo Baltic Horizon | ${role}`,
    adSetId: id('adset', ci), adSetName: `Demo Baltic | ${role} | Zestaw`,
  }));
  return { accountId, target: `act_${accountId}`, campaigns,
    ads: campaigns.flatMap((campaign, ci) => [0, 1].map(variant => ({
      ...campaign, ci, id: id('ad', ci * 2 + variant), campaignId: campaign.id,
      name: `Demo Baltic | ${campaign.role} | Wariant ${variant + 1}`,
      creativeId: id('creative', ci * 2 + variant),
      link: `https://baltic-horizon.example/oferty/demo-${ci + 1}-${variant + 1}`,
    }))),
  };
}

export function generateMetaAds(c: ScenarioConfig): MetaData {
  validateConfig(c);
  const cat = metaCatalog(c), days = calendar(c), rng = (key: string) => randomAt(c, META_ADS_VERSION, key);
  const profiles = cat.ads.map((_, i) => sourceWeights(c, `meta_ads:${i}`));
  const cells = days.flatMap((day, di) => cat.ads.map((ad, ai) => ({ key: `${day}:${ad.id}`, day, ad,
    weight: profiles[ai][di] })));
  // Within-tolerance pools vary by seed. Exact allocation conserves the sampled pool,
  // not the reference total; acceptable outcomes are not subsequently corrected.
  const pool = (target: number, scale: number, key: string) => Math.round(target * scale * (0.99 + rng(`pool:${key}`) * 0.02));
  const weights = (key: string, shares: readonly number[]) => cells.map(cell => ({ key: cell.key,
    weight: cell.weight * shares[cell.ad.ci] * (0.8 + rng(`${key}:${cell.key}`) * 0.4) }));
  // Implementation profile, not a new approved business target: roughly 65/35 spend.
  const money = allocateMoney(pool(metaTargets.spend, 100, 'spend'), weights('spend', [0.65, 0.35]));
  const impressions = largestRemainder(pool(metaTargets.impressions, 1, 'impressions'), weights('impressions', [0.72, 0.28]));
  const clicks = largestRemainder(pool(metaTargets.clicks, 1, 'clicks'), weights('clicks', [0.66, 0.34]).map((w, i) => ({ ...w, capacity: impressions[i] })));
  const links = largestRemainder(pool(metaTargets.link_clicks, 1, 'links'), weights('links', [0.65, 0.35]).map((w, i) => ({ ...w, capacity: clicks[i] })));
  const landing = largestRemainder(pool(metaTargets.landing_page_views, 1, 'landing'), weights('landing', [0.65, 0.35]).map((w, i) => ({ ...w, capacity: links[i] })));
  const search = largestRemainder(pool(metaTargets.search, 1, 'search'), weights('search', [0.55, 0.45]).map((w, i) => ({ ...w, capacity: landing[i] })));
  const sparse = (key: 'add_to_cart' | 'initiate_checkout' | 'purchases', slots: number, shares: readonly number[]) => {
    const ws = weights(key, shares);
    const selected = new Set(cells.map((cell, i) => ({ i,
      rank: -Math.log(1 - rng(`${key}:mask:${cell.key}`)) / ws[i].weight,
    })).sort((a, b) => a.rank - b.rank || a.i - b.i).slice(0, slots).map(x => x.i));
    return largestRemainder(pool(metaTargets[key], 1, key), ws.map((w, i) => ({ ...w, allowed: selected.has(i) })));
  };
  const cart = sparse('add_to_cart', 110, [0.4, 0.6]);
  const checkout = sparse('initiate_checkout', 50, [0.3, 0.7]);
  const purchases = sparse('purchases', 24, [0.3, 0.7]);
  const values = allocatePurchaseValues(pool(metaTargets.purchase_value, 100, 'purchase_value'), cells.map((cell, i) => ({
    key: cell.key, weight: purchases[i] * (0.85 + rng(`price:${cell.key}`) * 0.3),
    purchases: purchases[i], valueMeasured: true,
  })));
  const counts = [links, landing, search, cart, checkout, purchases];
  const data: MetaData = { AdCreatives_demo: [], AdInsights_demo: [], AdInsightsActions_demo: [], Ads_demo: [] };
  const created = warsawTimestamp(days[0], '08:00:00');
  cat.ads.forEach((ad, i) => {
    const title = ['Horyzont odpoczynku — demo', 'Nadmorski poranek — demo'][i % 2];
    const body = 'Syntetyczna oferta wypoczynku Hotel Baltic Horizon Demo.';
    data.AdCreatives_demo.push(metaRow('AdCreatives_demo', {
      ID: ad.creativeId, Target: cat.target, Name: `Kreacja demo ${i + 1}`, Body: body,
      CallToActionType: 'BOOK_TRAVEL', Title: title, LinkUrl: ad.link, ObjectType: 'SHARE', RunStatus: 'ACTIVE',
      ImageHash: hash([META_ADS_VERSION, c, 'image', i]), ImageUrl: `https://baltic-horizon.example/assets/demo-${i + 1}.jpg`,
      ObjectStorySpecLinkData: { link: ad.link, message: body, name: title,
        call_to_action: { type: 'BOOK_TRAVEL', value: { link: ad.link } } },
    }));
    data.Ads_demo.push(metaRow('Ads_demo', {
      ID: ad.id, Target: cat.target, Name: ad.name, CampaignId: ad.campaignId, AdSetId: ad.adSetId,
      AdCreativeId: ad.creativeId, AdStatus: 'ACTIVE', ConfiguredStatus: 'ACTIVE',
      CreatedTime: created, UpdatedTime: created, AdScheduleStartTime: created,
    }));
  });
  cells.forEach((cell, i) => {
    const ad = cell.ad, spend = metaUnits(money[i]), imp = impressions[i], click = clicks[i];
    const reach = Math.max(1, Math.round(imp / (1.5 + rng(`frequency:${cell.key}`))));
    const common = { Target: cat.target, DateStart: cell.day, DateEnd: cell.day, TimeIncrement: '1', Level: 'ad',
      ActionAttributionWindows: attribution, AdAccountId: cat.accountId, AdAccountName: accountName,
      CampaignId: ad.campaignId, CampaignName: cat.campaigns[ad.ci].name, AdSetId: ad.adSetId, AdSetName: ad.adSetName,
      AdId: ad.id, AdName: ad.name, AdEffectiveStatus: 'ACTIVE', UseAsync: false };
    data.AdInsights_demo.push(metaRow('AdInsights_demo', { ...common,
      AccountCurrency: c.currency_code, BuyingType: 'AUCTION', DefaultSummary: false, Objective: 'OUTCOME_SALES',
      Spend: money[i], Impressions: String(imp), Clicks: String(click), Reach: String(reach), Frequency: imp / reach,
      InlineLinkClicks: String(links[i]), LinkClicks: links[i],
      CPC: metaRatio(spend, click * 100), CPM: metaRatio(spend * 10, imp), CPP: metaRatio(spend * 10, reach),
      CTR: click / imp * 100, CostPerInlineLinkClick: metaRatio(spend, links[i] * 100),
    }));
    metaActions.forEach((action, ai) => {
      data.AdInsightsActions_demo.push(metaRow('AdInsightsActions_demo', { ...common,
        ActionCollection: 'Actions', ActionType: action.type, ActionValue: counts[ai][i], Action7dClick: String(counts[ai][i]),
      }));
    });
    data.AdInsightsActions_demo.push(metaRow('AdInsightsActions_demo', { ...common,
      ActionCollection: 'ActionValues', ActionType: purchaseType, ActionValue: Number(values[i]), Action7dClick: values[i],
    }));
  });
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  data.AdCreatives_demo.sort((a, b) => compare(a.ID!, b.ID!));
  data.Ads_demo.sort((a, b) => compare(a.ID!, b.ID!));
  data.AdInsights_demo.sort((a, b) => compare(a.DateStart!, b.DateStart!) || compare(a.AdId!, b.AdId!));
  data.AdInsightsActions_demo.sort((a, b) => compare(a.DateStart!, b.DateStart!) || compare(a.AdId!, b.AdId!) || compare(a.ActionCollection!, b.ActionCollection!) || compare(a.ActionType!, b.ActionType!));
  validateMetaAds(c, data);
  return data;
}

export function summarizeMetaAds(data: MetaData) {
  // Missing baseline measurements are errors, never silently interpreted as zero.
  const insights = data.AdInsights_demo, actions = data.AdInsightsActions_demo;
  const actionSum = (collection: string, type: string, scale: number) => sum(actions.filter(r => r.ActionCollection === collection && r.ActionType === type).map(r => metaUnits(r.ActionValue, scale))) / scale;
  return {
    rows: Object.fromEntries(metaTables.map(t => [t, data[t].length])),
    spend: sum(insights.map(r => metaUnits(r.Spend))) / 100,
    impressions: sum(insights.map(r => metaUnits(r.Impressions, 1))), clicks: sum(insights.map(r => metaUnits(r.Clicks, 1))),
    ...Object.fromEntries(metaActions.map(a => [a.key, actionSum('Actions', a.type, 1)])),
    purchase_value: actionSum('ActionValues', purchaseType, 100),
  } as { rows: Record<MetaTable, number> } & Record<keyof typeof metaTargets, number>;
}

export function validateMetaAds(c: ScenarioConfig, data: MetaData): void {
  validateConfig(c);
  if (Object.keys(data).length !== 4 || metaTables.some(t => !Array.isArray(data[t]))) throw new Error('Expected four source tables');
  for (const table of metaTables) for (const r of data[table]) {
    validateMetaRow(table, r);
    for (const [key, type] of Object.entries(metaSchemas[table])) {
      const v = (r as unknown as Record<string, unknown>)[key];
      if (v !== null && ['INT64', 'FLOAT64', 'BIGNUMERIC'].includes(type) && Number(v) < 0) throw new Error('Negative metric');
    }
  }
  const cat = metaCatalog(c), days = new Set(calendar(c));
  if (data.Ads_demo.length !== 4 || data.AdCreatives_demo.length !== 4 || data.AdInsights_demo.length !== 360 || data.AdInsightsActions_demo.length !== 2520) throw new Error('Incomplete baseline tables');
  assertUnique(data.Ads_demo.map(r => r.ID ?? '')); assertUnique(data.AdCreatives_demo.map(r => r.ID ?? ''));
  for (const r of data.AdCreatives_demo) {
    const ad = cat.ads.find(a => a.creativeId === r.ID);
    if (!ad || r.Target !== cat.target || r.LinkUrl !== ad.link || !r.ImageUrl?.startsWith('https://baltic-horizon.example/')) throw new Error('Invalid creative');
    const payload = r.ObjectStorySpecLinkData;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.link !== ad.link) throw new Error('Missing creative JSON');
  }
  for (const r of data.Ads_demo) {
    const ad = cat.ads.find(a => a.id === r.ID);
    if (!ad || r.Target !== cat.target || r.CampaignId !== ad.campaignId || r.AdSetId !== ad.adSetId || r.AdCreativeId !== ad.creativeId || r.Name !== ad.name) throw new Error('Broken ad relationship');
    if (!r.CreatedTime || !r.UpdatedTime || Date.parse(r.CreatedTime) > Date.parse(r.UpdatedTime) || Date.parse(r.UpdatedTime) > Date.parse(scenarioAsOf(c))) throw new Error('Invalid ad time');
  }
  const keyOf = (r: MetaRow<'AdInsights_demo'> | MetaRow<'AdInsightsActions_demo'>) => {
    const ad = cat.ads.find(a => a.id === r.AdId);
    if (!ad || r.Target !== cat.target || r.AdAccountId !== cat.accountId || r.AdAccountName !== accountName ||
        r.CampaignId !== ad.campaignId || r.CampaignName !== cat.campaigns[ad.ci].name || r.AdSetId !== ad.adSetId || r.AdSetName !== ad.adSetName || r.AdName !== ad.name ||
        r.DateStart === null || !days.has(r.DateStart) || r.DateEnd !== r.DateStart || r.TimeIncrement !== '1' || r.Level !== 'ad' || r.ActionAttributionWindows !== attribution) throw new Error('Invalid report dimensions');
    return `${r.DateStart}:${r.AdId}`;
  };
  const insights = new Map<string, MetaRow<'AdInsights_demo'>>();
  for (const r of data.AdInsights_demo) {
    const key = keyOf(r); if (insights.has(key)) throw new Error('Duplicate spend row'); insights.set(key, r);
    const spend = metaUnits(r.Spend), imp = metaUnits(r.Impressions, 1), clicks = metaUnits(r.Clicks, 1), links = metaUnits(r.InlineLinkClicks, 1), reach = metaUnits(r.Reach, 1);
    if (clicks > imp || links > clicks || r.LinkClicks !== links || (spend > 0 && imp === 0) || reach <= 0 || reach > imp || r.AccountCurrency !== 'PLN' || r.DefaultSummary !== false) throw new Error('Invalid delivery');
    if (r.CPC !== metaRatio(spend, clicks * 100) || r.CPM !== metaRatio(spend * 10, imp) || r.CPP !== metaRatio(spend * 10, reach) || r.CostPerInlineLinkClick !== metaRatio(spend, links * 100) ||
        r.CTR !== clicks / imp * 100 || r.Frequency !== imp / reach) throw new Error('Invalid source rate');
  }
  const actions = new Map<string, Map<string, number>>();
  for (const r of data.AdInsightsActions_demo) {
    const key = keyOf(r), purchaseValue = r.ActionCollection === 'ActionValues';
    if (!insights.has(key) || (!purchaseValue && r.ActionCollection !== 'Actions') || !metaActions.some(a => a.type === r.ActionType) || (purchaseValue && r.ActionType !== purchaseType)) throw new Error('Invalid action collection');
    const value = metaUnits(r.ActionValue, purchaseValue ? 100 : 1);
    if (r.Action7dClick === null || metaUnits(r.Action7dClick, purchaseValue ? 100 : 1) !== value ||
        [r.Action1dClick, r.Action1dView, r.Action7dView, r.Action28dClick, r.Action28dView, r.ActionDDA].some(v => v !== null)) throw new Error('Invalid attribution measurement');
    const entry = actions.get(key) ?? new Map<string, number>(), actionKey = `${r.ActionCollection}:${r.ActionType}`;
    if (entry.has(actionKey)) throw new Error('Duplicate action');
    entry.set(actionKey, value); actions.set(key, entry);
  }
  for (const [key, r] of insights) {
    const entry = actions.get(key);
    if (!entry || entry.size !== 7) throw new Error('Missing actions');
    const link = entry.get('Actions:link_click')!, landing = entry.get('Actions:landing_page_view')!;
    if (link !== r.LinkClicks || landing > link || entry.get('Actions:offsite_conversion.fb_pixel_search')! > landing) throw new Error('Invalid link/landing counts');
    if (entry.get(`ActionValues:${purchaseType}`)! > 0 && entry.get(`Actions:${purchaseType}`)! <= 0) throw new Error('Value requires purchase credit');
  }
  const s = summarizeMetaAds(data);
  for (const key of Object.keys(metaTargets) as (keyof typeof metaTargets)[]) {
    if (!withinTolerance(s[key], metaTargets[key], c.tolerances.relative)) throw new Error(`Outside target: ${key}`);
  }
}

export async function exportMetaAds(c: ScenarioConfig, directory: string) {
  const data = generateMetaAds(c);
  const files = metaTables.map(table => ({ table, path: `${table}.ndjson`, content: serializeMetaTable(table, data[table]) }));
  const manifest = { ...buildManifest(c, files.map(f => describeArtifact(f.path, Buffer.from(f.content)))),
    source_generator_version: META_ADS_VERSION, source_schema_hash: hash(metaSchemas),
    snapshot_as_of_at: scenarioAsOf(c), catalog: metaCatalog(c), summary: summarizeMetaAds(data),
    tables: files.map(f => ({ path: f.path, table: `meta_ads.${f.table}` })),
    policy: { version: 'meta-reporting-v1', level: 'ad', time_increment: 1, currency: c.currency_code,
      timezone: c.timezone, attribution_window: '7d_click', date_basis: 'synthetic_impression_date',
      attribution_note: 'Reporting policy only; no user journey simulation or claim about the reference account.',
      counts_collection: 'Actions', purchase_value_collection: 'ActionValues',
      spend_profile: 'approximately 65/35 prospecting/remarketing; implementation weights, not reference data',
      missing_measurements: 'NULL; other attribution windows and optional metrics not modelled',
      reach: 'unique only within each ad/day; sum is not deduplicated period reach',
      partitioning: 'ingestion time; _PARTITIONTIME is absent from records; assignment at future load, G08 deferred',
    },
  };
  await mkdir(directory); // New destination only. No overwrite, upload or partition writes.
  for (const f of files) await writeFile(join(directory, f.path), f.content, { flag: 'wx' });
  await writeFile(join(directory, 'manifest.json'), serializeManifest(manifest), { flag: 'wx' });
  return manifest;
}
