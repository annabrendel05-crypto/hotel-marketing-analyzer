import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ScenarioConfig } from '../config.mts';
import { generateProfitroom, validateProfitroom, validateSourceRow, summarizeProfitroom, nights, exportProfitroom,
  serializeProfitroom, sourceSchema, moneyCents, roomTypes, type Reservation } from '../profitroom.mts';
import { metricDate } from '../time.mts';
import { describeArtifact } from '../manifest.mts';
// Explicit fixture only; not a production date decision.
const fixture: ScenarioConfig = {scenario_id:'baltic_horizon_2026_v1',scenario_version:'0.3',generator_version:'foundation-v1',contract_version:'0.2',seed:'20260601',start_date:'2026-06-01',days:90,hotel_id:'hotel_demo_001',currency_code:'PLN',timezone:'Europe/Warsaw',tolerances:{relative:0.02,percentage_points:2}};
const expectedSchema = [
  ['Data rezerwacji','TIMESTAMP'],['Kod rezerwacji','STRING'],['Kanał rezerwacji','STRING'],['Oferta','STRING'],
  ['Typ pokoju','STRING'],['Liczba pokoi','INT64'],['Data przyjazdu','DATE'],['Data wyjazdu','DATE'],
  ['Data anulacji','TIMESTAMP'],['Wartość','FLOAT64'],['Zapłacono','FLOAT64'],['Pozostało do zapłaty','FLOAT64'],['Waluta','STRING'],
];
test('Profitroom repeats byte-for-byte, changes with seed and ignores system clock',t=>{
  const before=serializeProfitroom(generateProfitroom(fixture));
  t.mock.timers.enable({apis:['Date'],now:0});
  t.mock.method(Math,'random',()=>{throw new Error('Unseeded randomness');});
  assert.equal(serializeProfitroom(generateProfitroom(fixture)),before);
  t.mock.timers.setTime(9999999999999);
  assert.equal(serializeProfitroom(generateProfitroom(fixture)),before);
  assert.notEqual(serializeProfitroom(generateProfitroom({...fixture,seed:'other'})),before);
});
test('100 seeds: calibration, unique IDs, DST, booking windows, prices and payments',()=>{
  const ids=new Set<string>();
  for(let i=0;i<100;i++) {
    const c={...fixture,seed:String(i),start_date:i%2?'2026-03-01':'2026-09-01'};
    const rows=generateProfitroom(c); validateProfitroom(c,rows);
    const s=summarizeProfitroom(rows);
    assert.equal(s.total,s.cancelled+s.without_cancellation);
    for(const r of rows) {
      assert(!ids.has(r['Kod rezerwacji'])); ids.add(r['Kod rezerwacji']);
      const day=metricDate(r['Data rezerwacji']);
      const lead=(Date.parse(r['Data przyjazdu']+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000;
      assert(lead>=1&&lead<=90);
      const length=nights(r)!;
      assert(length>=2&&length<=5);
      assert(r['Liczba pokoi']>0&&Number.isInteger(r['Liczba pokoi']));
      const tier=roomTypes.findIndex(t=>t===r['Typ pokoju'])+1;
      const relative=r.Wartość/(length*r['Liczba pokoi']*(500+tier*65));
      assert(relative>=0.68-0.00001&&relative<=1.38+0.00001);
      assert(Date.parse(r['Data rezerwacji'])<Date.parse(r['Data przyjazdu']+'T00:00:00Z'));
      assert(r.Wartość>0&&r.Zapłacono>=0&&r['Pozostało do zapłaty']>=0);
      assert.equal(moneyCents(r.Zapłacono)+moneyCents(r['Pozostało do zapłaty']),moneyCents(r.Wartość));
      if(r['Data anulacji']!==null) {
        assert(Date.parse(r['Data anulacji'])>=Date.parse(r['Data rezerwacji']));
        assert(r.Wartość>0);
      }
    }
    assert.equal(s.value_without_cancellation,(rows.filter(r=>r['Data anulacji']===null).reduce((s,r)=>s+moneyCents(r.Wartość),0)/100).toFixed(2));
    assert(rows.some(r=>r['Data anulacji']===null&&r.Zapłacono>0&&r['Pozostało do zapłaty']>0));
    assert(rows.some(r=>r['Data wyjazdu']>metricDate(rows.at(-1)!['Data rezerwacji'])));
  }
});
test('DDL and exported records match exact 13 names, types, nullable and ordinal positions',async()=>{
  const ddl=await readFile(new URL('../../ddl/004_create_profitroom_reservations_demo.sql',import.meta.url),'utf8');
  const fields=[...ddl.matchAll(/^  `([^`]+)` (STRING|TIMESTAMP|DATE|INT64|FLOAT64)([^\n]*)$/gm)];
  assert.deepEqual(fields.map(f=>[f[1],f[2]]),expectedSchema);
  assert(fields.every(f=>!f[3].includes('NOT NULL')));
  assert.deepEqual(sourceSchema,expectedSchema);
  const rows=generateProfitroom(fixture);
  for(const row of rows) {
    assert.deepEqual(Object.keys(row),expectedSchema.map(f=>f[0]));
    for(const [key,type] of expectedSchema) {
      const value: unknown=(row as unknown as Record<string,unknown>)[key];
      if(value!==null) assert.equal(typeof value,['INT64','FLOAT64'].includes(type)?'number':'string');
    }
  }
  for(const line of serializeProfitroom(rows).trim().split('\n')) assert.deepEqual(Object.keys(JSON.parse(line)),expectedSchema.map(f=>f[0]));
  const nullRow=Object.fromEntries(sourceSchema.map(([k])=>[k,null]));
  validateSourceRow(nullRow); // Every field is nullable in source, not required by demo schema.
  assert.deepEqual(JSON.parse(serializeProfitroom([nullRow])),nullRow);
  assert.throws(()=>validateSourceRow({...rows[0],is_cancelled:false}));
  const incomplete={...rows[0]} as Partial<Reservation>; delete incomplete.Oferta;
  assert.throws(()=>validateSourceRow(incomplete));
});
test('source NULL does not become zero or a confirmed/active status',()=>{
  const rows=generateProfitroom(fixture);
  const r={...rows.find(r=>r['Data anulacji']===null)!,Wartość:null};
  assert.equal(summarizeProfitroom([r]).value_without_cancellation,null);
  assert.equal(summarizeProfitroom([r]).without_cancellation,1);
  assert.equal(nights({...r,'Data przyjazdu':null}),null);
});
test('validator rejects invalid channels, dates, room counts and monetary balance',()=>{
  const rows=generateProfitroom(fixture);
  const patches: Partial<Reservation>[]=[{'Kanał rezerwacji':'invalid'},{'Liczba pokoi':0},{'Liczba pokoi':1.5},
    {Wartość:-1},{Zapłacono:-1},{'Pozostało do zapłaty':-1},{Zapłacono:rows[0].Zapłacono+0.01},
    {'Data wyjazdu':rows[0]['Data przyjazdu']},{'Data anulacji':'2026-01-01T00:00:00Z'},
    {'Data rezerwacji':'2026-06-01T24:00:00Z'}];
  for(const patch of patches) assert.throws(()=>validateProfitroom(fixture,[{...rows[0],...patch},...rows.slice(1)]));
  assert.throws(()=>generateProfitroom({...fixture,start_date:''}));
});
test('strict date regression and out-of-model booking windows remain rejected',()=>{
  const c={...fixture,start_date:'2026-01-01'},rows=generateProfitroom(c);
  for(const patch of [
    {'Data przyjazdu':'2026-02-30','Data wyjazdu':'2026-03-04'},
    {'Data przyjazdu':'2027-01-01','Data wyjazdu':'2027-01-03'},
  ]) assert.throws(()=>validateProfitroom(c,[{...rows[0],...patch},...rows.slice(1)]));
});
test('two exports have identical NDJSON, hashes and manifests; existing directory is protected',async()=>{
  const root=await mkdtemp(join(tmpdir(),'profitroom-test-'));
  try {
    const dir=join(root,'first'),other=join(root,'second');
    const manifest=await exportProfitroom(fixture,dir);
    const data=await readFile(join(dir,'profitroom.ndjson'));
    assert.deepEqual(data.toString().trim().split('\n').map(line=>JSON.parse(line)),generateProfitroom(fixture));
    assert.deepEqual(manifest.artifacts[0],describeArtifact('profitroom.ndjson',data));
    assert.deepEqual(JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')),manifest);
    await exportProfitroom(fixture,other);
    assert.deepEqual(await readFile(join(other,'profitroom.ndjson')),data);
    assert.deepEqual(await readFile(join(other,'manifest.json')),await readFile(join(dir,'manifest.json')));
    await assert.rejects(exportProfitroom(fixture,dir),{code:'EEXIST'});
  } finally {await rm(root,{recursive:true,force:true});}
});
