import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { buildManifest, serializeManifest } from './manifest.mts';
import { validateConfig, type ScenarioConfig } from './config.mts';
import { hash, randomAt, randomStream, ga4SessionId } from './random.mts';
import { calendar, warsawTimestamp } from './time.mts';
import { sourceWeights } from './signals.mts';
import { largestRemainder } from './allocation.mts';
import { ga4Schema } from './ga4-schema.mts';

export const GA4_VERSION = 'ga4-demo-generator-v1';
// Version the session policy separately, keeping the existing event allocation/IDs stable.
export const GA4_SESSION_POLICY = 'session-engagement-v2';
export const ga4KeyEvents: readonly string[] = ['conversion_event_contact', 'form_submit',
  'open_apartment_details', 'open_package_details', 'purchase', 'step1_dates_and_rooms',
  'step2_extras', 'step3_confirmation', 'step4_payment_confirmation'];
export const ga4Targets = { session_start: 92123, page_view: 230810, user_engagement: 124773,
  step1_dates_and_rooms: 36207, step2_extras: 1940, step3_confirmation: 513,
  purchase: 80, click_tel: 590, form_submit: 237, open_apartment_details: 13537, open_package_details: 6053 } as const;
type Event = keyof typeof ga4Targets;
type Value<T> = T extends 'STRING' ? string | null : T extends 'INT64' ? string | null :
  T extends 'FLOAT64' ? number | null : T extends 'BOOL' ? boolean | null :
  T extends { readonly array: infer U } ? Value<U>[] : T extends object ? { -readonly [K in keyof T]: Value<T[K]> } | null : never;
export type GA4Row = { -readonly [K in keyof typeof ga4Schema]: Value<typeof ga4Schema[K]> };
function empty(schema: unknown): unknown {
  if (typeof schema === 'string') return null;
  const fields = schema as Record<string, unknown>;
  if ('array' in fields) return [];
  return Object.fromEntries(Object.entries(fields).map(([k,v]) => [k, empty(v)]));
}
// Only synthetic session categories, not evidence of paths of real people.
export const ga4Channels = [
  ['Paid Social', 35.01, 'facebook', 'paid_social'], ['Paid Search', 14.67, 'google', 'cpc'],
  ['Organic Search', 13.67, 'google', 'organic'], ['Referral', 11.14, 'travel.example', 'referral'],
  ['Unassigned', 11.04, null, null], ['Organic Social', 6.94, 'facebook', 'social'],
  ['Direct', 6.21, '(direct)', '(none)'], ['Other', 1.32, null, null],
] as const;
// Stream one day at a time: no half-million-row buffer and no system clock.
// Stable order: day, internal session ordinal, event stage. No cross-source linkage.
export function* generateGA4(config: ScenarioConfig): Generator<GA4Row> {
  validateConfig(config);
  const c = structuredClone(config);
  const rng = randomStream(c, 'ga4:v1');
  const prefix = hash([GA4_VERSION, c]).slice(0, 24);
  const days = calendar(c);
  const events = Object.keys(ga4Targets) as Event[];
  const budgets = Object.fromEntries(events.map(name => {
    const target = Math.round(ga4Targets[name] * (0.995 + rng() * 0.01));
    return [name, largestRemainder(target, sourceWeights(c, `ga4:${name}`).map((weight,i) => ({ key: days[i], weight })))];
  })) as Record<Event, number[]>;
  let sessionIndex = 0;
  for (const [dayIndex, day] of days.entries()) {
    const count = budgets.session_start[dayIndex];
    const sessions: Event[][] = Array.from({length: count}, () => ['session_start']);
    for (const name of events.filter(n => n !== 'session_start')) {
      // Each stage/contact at most once; repeated page views and engagement are allowed.
      const order = Array.from({length: count}, (_,i) => i);
      for (let i = count - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i],order[j]] = [order[j],order[i]]; }
      const n = budgets[name][dayIndex];
      if (!['page_view','user_engagement'].includes(name) && n > count) throw new Error('Stage exceeds session capacity');
      for (let i = 0; i < n; i++) sessions[order[i % count]].push(name);
    }
    const base = Date.parse(warsawTimestamp(day, '08:00:00'));
    for (const names of sessions) {
      const index = sessionIndex++;
      const sessionId = ga4SessionId(c, 'ga4:v1', index);
      // 10% limited measurement is a synthetic v1 parameter, not a measured benchmark.
      const limited = rng() < 0.1;
      const mobile = rng() < 0.8745;
      let channelRoll = rng() * 100;
      const channel = ga4Channels.find(ch => (channelRoll -= ch[1]) < 0) ?? ga4Channels[7];

      const sessionCampaign = channel[0] === 'Paid Social'
        ? (randomAt(c, 'ga4:v1:paid-social-campaign', index) < 0.65
          ? 'Demo Baltic Horizon | prospecting'
          : 'Demo Baltic Horizon | remarketing')
        : null;

      const start = base + Math.floor(rng() * 14 * 3600) * 1000;
      names.sort((a,b) => events.indexOf(a) - events.indexOf(b));
      // Independent draws preserve all existing event counts, devices and channel draws.
      // Synthetic mix, not a reference benchmark: 25% short, 50% medium, 25% long.
      const band = randomAt(c, GA4_SESSION_POLICY, index);
      const fraction = randomAt(c, `${GA4_SESSION_POLICY}:duration`, index);
      const duration = Math.floor(band < 0.25 ? 1000 + fraction * 7000 :
        band < 0.75 ? 10000 + fraction * 48000 : 61000 + fraction * 179000);
      const lastEngagement = names.lastIndexOf('user_engagement');
      const engaged = duration >= 10000 || names.filter(n => n === 'page_view').length >= 2 || names.some(n => ga4KeyEvents.includes(n));
      let previousEngagementOffset = 0;
      for (const [ordinal, name] of names.entries()) {
        // Accumulated engagement never exceeds elapsed time. Later stages remain ordered.
        const offset = lastEngagement > 0 ? (ordinal <= lastEngagement ?
          Math.floor(duration * ordinal / lastEngagement) : duration + (ordinal - lastEngagement) * 100) :
          Math.floor(duration * ordinal / Math.max(1, names.length - 1));
        const row = empty(ga4Schema) as GA4Row;
        row.event_date = day.replaceAll('-', '');
        row.event_timestamp = (BigInt(start + offset) * 1000n).toString();
        row.event_name = name;
        row.user_pseudo_id = limited ? null : `demo_browser_${prefix}_${index}`;
        row.stream_id = 'demo_web_001'; row.platform = 'WEB';
        row.privacy_info = { analytics_storage: limited ? 'No' : 'Yes', ads_storage: limited ? 'No' : 'Yes', uses_transient_token: 'No' };
        row.device!.category = mobile ? 'mobile' : 'desktop';
        row.device!.operating_system = mobile ? 'Android' : 'Windows';
        row.device!.web_info = {browser:'Chrome', browser_version:null, hostname:'baltic-horizon.example'};
        // Unique devices in minimal v1; first observed acquisition equals first session.
        row.traffic_source = {
          name: sessionCampaign,
          medium: channel[3],
          source: channel[2],
        };

        const collected = row.collected_traffic_source!;
        collected.manual_source = channel[2];
        collected.manual_medium = channel[3];
        collected.manual_campaign_name = sessionCampaign;

        const cross = row.session_traffic_source_last_click!.cross_channel_campaign!;
        cross.source = channel[2];
        cross.medium = channel[3];
        cross.campaign_name = sessionCampaign;
        cross.default_channel_group = channel[0];
        cross.primary_channel_group = channel[0];
        const param = (key: string, string_value: string | null, int_value: string | null) =>
          ({key, value:{string_value, int_value, float_value:null, double_value:null}});
        row.event_params = [param('page_location', 'https://baltic-horizon.example/', null)];
        if (!limited || name === 'session_start') row.event_params.push(param('ga_session_id', null, sessionId));
        row.event_params.push(param('session_engaged', null, engaged ? '1' : '0'));
        if (name === 'user_engagement') {
          row.event_params.push(param('engagement_time_msec', null, String(offset - previousEngagementOffset)));
          previousEngagementOffset = offset;
        }
        row.ecommerce = null; // Revenue and transaction identity are uncalibrated; never copied from Profitroom.
        yield row;
      }
    }
  }
}
export function summarizeGA4(rows: Iterable<GA4Row>) {
  const events: Record<string, number> = {};
  const channels: Record<string, number> = {};
  let records = 0, mobile = 0, limitedSessions = 0;
  for (const row of rows) {
    records++; events[row.event_name!] = (events[row.event_name!] ?? 0) + 1;
    if (row.event_name === 'session_start') {
      mobile += Number(row.device?.category === 'mobile');
      limitedSessions += Number(row.user_pseudo_id === null);
      const channel = row.session_traffic_source_last_click!.cross_channel_campaign!.default_channel_group!;
      channels[channel] = (channels[channel] ?? 0) + 1;
    }
  }
  return {records, events, mobile_percentage: mobile / events.session_start * 100, limitedSessions, channels};
}

// Stream bounded chunks: the full 90-day NDJSON need not fit in memory.
// A new directory is required; a complete manifest is published only after the file closes.
export async function exportGA4(config: ScenarioConfig, directory: string) {
  validateConfig(config);
  const c = structuredClone(config);
  await mkdir(directory);
  const path = 'events_demo.ndjson';
  const sha = createHash('sha256');
  let bytes = 0, records = 0;
  async function* chunks() {
    let chunk = '';
    for (const row of generateGA4(c)) {
      chunk += JSON.stringify(row) + '\n';
      records++;
      if (chunk.length >= 1024 * 1024) {
        const buffer = Buffer.from(chunk); bytes += buffer.length; sha.update(buffer);
        yield buffer; chunk = '';
      }
    }
    if (chunk) { const buffer = Buffer.from(chunk); bytes += buffer.length; sha.update(buffer); yield buffer; }
  }
  await pipeline(chunks(), createWriteStream(join(directory, path), { flags: 'wx' }));
  const manifest = { ...buildManifest(c, [{ path, status: 'present', sha256: sha.digest('hex'), bytes }]),
    source_generator_version: GA4_VERSION, session_policy_version: GA4_SESSION_POLICY, source_schema_hash: hash(ga4Schema), records,
    tables: [{ path, table: 'ga4.events_demo' }],
  };
  await writeFile(join(directory, 'manifest.json'), serializeManifest(manifest), { flag: 'wx' });
  return manifest;
}
