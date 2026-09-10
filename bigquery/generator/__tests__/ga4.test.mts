import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { generateGA4, summarizeGA4, ga4Targets, ga4Channels, type GA4Row } from '../ga4.mts';
import { ga4Schema } from '../ga4-schema.mts';
import type { ScenarioConfig } from '../config.mts';
import { metricDate } from '../time.mts';
const fixture: ScenarioConfig = {scenario_id:'baltic_horizon_2026_v1', scenario_version:'0.3',
  generator_version:'foundation-v1', contract_version:'0.2', seed:'20260601', start_date:'2026-06-01',
  days:90, hotel_id:'hotel_demo_001', currency_code:'PLN', timezone:'Europe/Warsaw',
  tolerances:{relative:0.02,percentage_points:2}}; // Explicit test date only.
let digest = '';
function schemaType(s: unknown): string {
  if (typeof s === 'string') return s;
  const obj = s as Record<string,unknown>;
  if ('array' in obj) return `ARRAY<${schemaType(obj.array)}>`;
  return `STRUCT<${Object.entries(obj).map(([k,v])=>`${k} ${schemaType(v)}`).join(',')}>`;
}
function check(s: unknown, v: unknown): void {
  if (v === null) return; // DDL fields nullable.
  if (typeof s === 'string') {
    if(s === 'INT64') { assert.equal(typeof v,'string'); assert(BigInt(v as string) <= 9223372036854775807n); }
    else assert.equal(typeof v, {STRING:'string',FLOAT64:'number',BOOL:'boolean'}[s]);
    return;
  }
  const obj = s as Record<string,unknown>;
  if ('array' in obj) { assert(Array.isArray(v)); for(const x of v) check(obj.array,x); return; }
  assert.deepEqual(Object.keys(v as object),Object.keys(obj));
  for(const [k,t] of Object.entries(obj)) check(t,(v as Record<string,unknown>)[k]);
}
test('GA4 matches source DDL including nested order, types and nullable fields',()=>{
  const ddl=readFileSync(new URL('../../ddl/001_create_ga4_events_demo.sql',import.meta.url),'utf8');
  const fields=ddl.slice(ddl.indexOf('(')+1,ddl.lastIndexOf(')')).replace(/\s/g,'');
  const expected=Object.entries(ga4Schema).map(([k,v])=>`${k} ${schemaType(v)}`).join(',').replace(/\s/g,'');
  assert.equal(expected,fields); assert.equal(Object.keys(ga4Schema).length,31);
  const row=generateGA4(fixture).next().value!; check(ga4Schema,row);
  assert.deepEqual(JSON.parse(JSON.stringify(row)),row);
});
test('GA4 full 90-day fixture preserves targets, identifiers, measurement and local dates',()=>{
  const days=new Set<string>(); const users=new Set<string>(); const sha=createHash('sha256');
  let lastSession: string|null=null; let lastTime=0n;
  function* inspected(): Generator<GA4Row> {
    for(const row of generateGA4(fixture)) {
      sha.update(JSON.stringify(row)+'\n');
      assert(!['engaged_view','click_mail'].includes(row.event_name!));
      if(row.event_name==='session_start') {
        assert(!users.has(row.user_pseudo_id!)); if(row.user_pseudo_id) users.add(row.user_pseudo_id);
        lastSession=row.user_pseudo_id; lastTime=BigInt(row.event_timestamp!);
        if(!days.has(row.event_date!)) { check(ga4Schema,row); days.add(row.event_date!); }
      } else { assert.equal(row.user_pseudo_id,lastSession); assert(BigInt(row.event_timestamp!)>lastTime); lastTime=BigInt(row.event_timestamp!); }
      if(row.event_name==='purchase') assert.equal(row.ecommerce,null);
      if(!row.user_pseudo_id) assert(!row.event_params.some(p=>p?.key==='ga_session_id'));
      // UTC timestamp stays within the declared local date, including DST.
      if(row.event_name==='session_start') assert.equal(metricDate(new Date(Number(BigInt(row.event_timestamp!)/1000n)).toISOString()).replaceAll('-',''),row.event_date);
      yield row;
    }
  }
  const summary=summarizeGA4(inspected()); digest=sha.digest('hex');
  assert.equal(days.size,90);
  for(const [key,target] of Object.entries(ga4Targets)) assert(Math.abs(summary.events[key]-target)<=target*0.02,key);
  assert(Math.abs(summary.mobile_percentage-87.45)<2);
  for(const [channel,share] of ga4Channels) assert(Math.abs(summary.channels[channel]/summary.events.session_start*100-share)<2);
  assert(summary.limitedSessions>0);
  console.log('GA4 fixture:',JSON.stringify(summary));
});
test('GA4 deterministic serialized result ignores clock; seed changes records; DST start is valid',t=>{
  t.mock.timers.enable({apis:['Date'],now:0});
  t.mock.method(Math,'random',()=>{throw Error('Unseeded randomness');});
  const sha=createHash('sha256'); for(const row of generateGA4(fixture)) sha.update(JSON.stringify(row)+'\n');
  assert.equal(sha.digest('hex'),digest);
  assert.notDeepEqual(generateGA4({...fixture,seed:'different'}).next().value,generateGA4(fixture).next().value);
  for(const start_date of ['2026-03-29','2026-10-25']) {
    const row=generateGA4({...fixture,start_date}).next().value!;
    assert.equal(metricDate(new Date(Number(BigInt(row.event_timestamp!)/1000n)).toISOString()),start_date);
  }
});
