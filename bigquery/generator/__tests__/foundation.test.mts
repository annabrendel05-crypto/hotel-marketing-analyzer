import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { validateConfig, type ScenarioConfig } from '../config.mts';
import { canonical, hash, randomAt, randomStream, syntheticId, ga4SessionId } from '../random.mts';
import { addDays, calendar, warsawTimestamp, metricDate, scenarioAsOf, loadedAt, snapshotLoadedAt } from '../time.mts';
import { normalizeWeights, largestRemainder, weightedAllocation, allocateMoney, withinTolerance, withinShareTolerance, allocatePurchaseValues, validatePurchaseValues, assertUnique, nonnegative, clamp } from '../allocation.mts';
import { dailySignals, sourceWeights } from '../signals.mts';
import { buildManifest, describeArtifact, inspectArtifact, serializeManifest } from '../manifest.mts';

// Fixture only: this date is not the final demo start_date.
const config: ScenarioConfig = {
  scenario_id: 'baltic_horizon_2026_v1', scenario_version: '0.3', generator_version: 'foundation-v1',
  contract_version: '0.2', seed: '20260601', start_date: '2026-06-01', days: 90,
  hotel_id: 'hotel_demo_001', currency_code: 'PLN', timezone: 'Europe/Warsaw',
  tolerances: { relative: 0.02, percentage_points: 2 },
};
const cells = [{ key: 'a', weight: 1 }, { key: 'b', weight: 1 }, { key: 'c', weight: 1 }];

test('configuration rejects missing/invalid inputs without date defaults', () => {
  validateConfig(config);
  for (const patch of [{start_date: ''}, {start_date: '2026-02-30'}, {days: 89}, {timezone: 'UTC'}, {currency_code: 'EUR'}, {seed: ''}, {tolerances: null}]) {
    assert.throws(() => validateConfig({...config, ...patch}));
  }
});
test('indexed RNG and streams repeat; seeds differ; namespaces independent', () => {
  const a = randomStream(config, 'ga4'); const b = randomStream(config, 'ga4');
  const expected = Array.from({length: 50}, () => a());
  for (let i=0;i<500;i++) randomAt(config, 'meta_ads', i);
  assert.deepEqual(Array.from({length:50}, () => b()), expected);
  assert.notEqual(randomAt(config, 'ga4', 0), randomAt({...config, seed:'other'}, 'ga4', 0));
  assert.notEqual(randomAt(config, 'ga4', 0), randomAt(config, 'google_ads', 0));
  assert(expected.every(x => x >= 0 && x < 1));
  assert.equal(hash(config), hash(JSON.parse(canonical(config))));
  assert.throws(() => canonical({bad: NaN}));
});
test('all ID kinds stable, seeded record IDs unique, session IDs fit INT64', () => {
  for (const kind of ['scenario','hotel','batch','account','customer','campaign','reservation','ga4_user','ga4_session'] as const) {
    assert.equal(syntheticId(config,kind,'test',3), syntheticId(config,kind,'test',3));
  }
  const ids = Array.from({length:1000}, (_,i) => syntheticId(config,'reservation','profitroom',i));
  assertUnique(ids);
  assert.notEqual(ids[0], syntheticId({...config,seed:'different'},'reservation','profitroom',0));
  const sessions = Array.from({length:1000},(_,i) => ga4SessionId(config,'ga4',i));
  assertUnique(sessions);
  assert(sessions.every(id => BigInt(id)>0n && BigInt(id)<2n**63n));
  assert.throws(() => assertUnique(['a','a']));
});
test('90 calendar days and deterministic scenario/import clocks', () => {
  const days=calendar(config);
  assert.equal(days.length,90); assert.equal(days.at(-1),'2026-08-29');
  assertUnique(days);
  days.slice(1).forEach((date,i) => assert.equal(date,addDays(days[i],1)));
  assert.equal(scenarioAsOf(config),'2026-08-30T06:00:00.000Z');
  assert.equal(loadedAt(config,days[0]),'2026-06-02T06:00:00.000Z');
  assert.equal(snapshotLoadedAt(config),scenarioAsOf(config));
  assert.throws(() => loadedAt(config,'2026-05-31'));
});
test('Warsaw DST gaps, overlaps, local midnight and winter offset', () => {
  assert.equal(warsawTimestamp('2026-01-15','08:00:00'),'2026-01-15T07:00:00.000Z');
  assert.equal(metricDate('2026-06-01T22:30:00Z'),'2026-06-02');
  assert.throws(() => warsawTimestamp('2026-03-29','02:30:00'));
  assert.throws(() => warsawTimestamp('2026-10-25','02:30:00'));
  assert.equal(warsawTimestamp('2026-10-25','02:30:00','earlier'),'2026-10-25T00:30:00.000Z');
  assert.equal(warsawTimestamp('2026-10-25','02:30:00','later'),'2026-10-25T01:30:00.000Z');
  const c={...config,start_date:'2026-03-01'};
  assert.equal(calendar(c).length,90);
});
test('weights and largest remainders: mask, ties, caps, zeros and invalid targets', () => {
  assert.deepEqual(normalizeWeights(cells),[1/3,1/3,1/3]);
  assert.deepEqual(weightedAllocation(9,cells),[3,3,3]);
  assert.deepEqual(largestRemainder(10,cells),[4,3,3]);
  assert.deepEqual(largestRemainder(10,[...cells].reverse()),[3,3,4]);
  assert.deepEqual(largestRemainder(8,[{key:'a',weight:10,capacity:2},{key:'b',weight:1}]),[2,6]);
  assert.deepEqual(largestRemainder(0,[]),[]);
  assert.deepEqual(largestRemainder(0,[{key:'a',weight:0,allowed:false}]),[0]);
  for (const c of [[],[{key:'a',weight:0}],[{key:'a',weight:2,allowed:false}],[{key:'a',weight:1,capacity:0}]]) assert.throws(() => largestRemainder(1,c));
  assert.throws(() => largestRemainder(-1,cells));
  assert.throws(() => largestRemainder(2,[{key:'a',weight:-1}]));
  assert.throws(() => largestRemainder(1.1,cells));
});
test('zero-capacity cells do not suppress available weights during normalization', () => {
  assert.deepEqual(largestRemainder(1, [
    {key:'A',weight:1e12,capacity:0},
    {key:'B',weight:1,capacity:1},
  ]), [0,1]);
});
test('positive target with all capacities zero still fails', () => {
  assert.throws(() => largestRemainder(1, [
    {key:'A',weight:1e12,capacity:0},
    {key:'B',weight:1,capacity:0},
  ]), /Positive target without available weighted capacity/);
});
test('allocations preserve sums and capacities across many deterministic inputs', () => {
  for(let i=0;i<100;i++) {
    const c=Array.from({length:10},(_,j)=>({key:String(j),weight:randomAt(config,'allocation',`${i}:${j}`),capacity:20}));
    const out=largestRemainder(i,c);
    assert.equal(out.reduce((a,b)=>a+b,0),i);
    assert(out.every(n=>Number.isInteger(n)&&n>=0&&n<=20));
  }
  assert.deepEqual(allocateMoney(100,cells),['0.34','0.33','0.33']);
});
test('tolerances do not mutate acceptable results; shares use percentage points', () => {
  assert(withinTolerance(102,100)); assert(!withinTolerance(103,100));
  assert(withinTolerance(0,0)); assert(!withinTolerance(1,0));
  assert(withinTolerance(11,10,0.02,1));
  assert(withinShareTolerance(89.45,87.45)); assert(!withinShareTolerance(90,87.45));
  assert.throws(()=>nonnegative(-1)); assert.throws(()=>nonnegative(Infinity));
  assert.equal(clamp(-1,0,1),0); assert.throws(()=>clamp(1,2,0));
});
test('purchase values follow positive measured allowed credit; NULL differs from zero', () => {
  const c=[
    {key:'zero',weight:10,purchases:0,valueMeasured:true},
    {key:'unknown',weight:10,purchases:null,valueMeasured:true},
    {key:'credit',weight:1,purchases:0.5,valueMeasured:true},
    {key:'missing_value',weight:10,purchases:1,valueMeasured:false},
    {key:'blocked',weight:10,purchases:1,valueMeasured:true,allowed:false},
  ];
  assert.deepEqual(allocatePurchaseValues(101,c),['0.00',null,'1.01',null,'0.00']);
  assert.deepEqual(allocatePurchaseValues(null,c),c.map(()=>null));
  assert.throws(()=>allocatePurchaseValues(1,c.slice(0,2)));
  assert.throws(()=>validatePurchaseValues(c,['1.00',null,'0.01',null,'0.00']));
  assert.deepEqual(allocatePurchaseValues(0,c.slice(0,2)),['0.00',null]);
});
test('signals reproducible, bounded, irregular and source-specific', () => {
  assert.deepEqual(dailySignals(config),dailySignals(config));
  assert.notDeepEqual(dailySignals(config),dailySignals({...config,seed:'different'}));
  assert.equal(new Set(dailySignals(config).map(d=>d.demand)).size,90);
  assert(dailySignals(config).every(d=>d.demand>=0.6&&d.demand<=1.7));
  assert.notDeepEqual(sourceWeights(config,'ga4'),sourceWeights(config,'meta_ads'));
});
test('manifest canonical, content hashes verified, planned artifacts distinct', async () => {
  const bytes=await readFile(new URL('../config.mts',import.meta.url));
  const present=await inspectArtifact(fileURLToPath(new URL('../config.mts',import.meta.url)),'fixtures/config.mts');
  assert.deepEqual(present,describeArtifact('fixtures/config.mts',bytes));
  const planned=describeArtifact('future/test.ndjson');
  assert.equal(planned.sha256,null);
  assert.equal(serializeManifest(buildManifest(config,[present,planned])),serializeManifest(buildManifest(config,[planned,present])));
  assert.throws(()=>buildManifest(config,[planned,planned]));
  assert.throws(()=>describeArtifact('../escape'));
});
test('helpers independent of current clock and uncontrolled randomness', t => {
  const before=canonical({signals:dailySignals(config),manifest:buildManifest(config),id:syntheticId(config,'batch','common',0)});
  t.mock.timers.enable({apis:['Date'],now:0});
  t.mock.method(Math,'random',()=>{throw new Error('Uncontrolled random');});
  const after=canonical({signals:dailySignals(config),manifest:buildManifest(config),id:syntheticId(config,'batch','common',0)});
  assert.equal(after,before);
  t.mock.timers.setTime(9999999999999);
  assert.equal(serializeManifest(buildManifest(config)),serializeManifest(buildManifest(config)));
});
