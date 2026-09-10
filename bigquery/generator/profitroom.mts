import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ScenarioConfig, validateConfig, validateDate } from './config.mts';
import { randomAt, syntheticId } from './random.mts';
import { calendar, addDays, warsawTimestamp, scenarioAsOf, metricDate } from './time.mts';
import { sourceWeights } from './signals.mts';
import { largestRemainder, allocateMoney, withinTolerance, assertUnique } from './allocation.mts';
import { buildManifest, describeArtifact, serializeManifest } from './manifest.mts';

export const PROFITROOM_VERSION = 'profitroom-source-demo-generator-v1';
export const channels = ['Booking.com', 'Expedia', 'Booking Engine'] as const;
export const offers = ['Morski wypoczynek demo', 'Poranek nad zatoką demo', 'Nadmorski reset demo'] as const;
export const roomTypes = ['Pokój Komfort demo', 'Pokój Panorama demo', 'Studio Bałtyckie demo', 'Apartament Horyzont demo'] as const;
// Source schema, in ordinal order. No canonical or technical columns.
export const sourceSchema = [
  ['Data rezerwacji','TIMESTAMP'], ['Kod rezerwacji','STRING'], ['Kanał rezerwacji','STRING'],
  ['Oferta','STRING'], ['Typ pokoju','STRING'], ['Liczba pokoi','INT64'],
  ['Data przyjazdu','DATE'], ['Data wyjazdu','DATE'], ['Data anulacji','TIMESTAMP'],
  ['Wartość','FLOAT64'], ['Zapłacono','FLOAT64'], ['Pozostało do zapłaty','FLOAT64'], ['Waluta','STRING'],
] as const;
export interface Reservation {
  'Data rezerwacji': string | null;
  'Kod rezerwacji': string | null;
  'Kanał rezerwacji': string | null;
  'Oferta': string | null;
  'Typ pokoju': string | null;
  'Liczba pokoi': number | null;
  'Data przyjazdu': string | null;
  'Data wyjazdu': string | null;
  'Data anulacji': string | null;
  'Wartość': number | null;
  'Zapłacono': number | null;
  'Pozostało do zapłaty': number | null;
  'Waluta': string | null;
}
type DemoReservation = { [K in keyof Reservation]: K extends 'Data anulacji' ? Reservation[K] : NonNullable<Reservation[K]> };
export function nights(r: Pick<Reservation, 'Data przyjazdu' | 'Data wyjazdu'>): number | null {
  if (r['Data przyjazdu'] === null || r['Data wyjazdu'] === null) return null;
  validateDate(r['Data przyjazdu']); validateDate(r['Data wyjazdu']);
  return (Date.parse(`${r['Data wyjazdu']}T00:00:00Z`) - Date.parse(`${r['Data przyjazdu']}T00:00:00Z`)) / 86400000;
}
export function moneyCents(value: number): number {
  const n = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(n) || Math.abs(value * 100 - n) > 0.000001) throw new Error('Invalid cent precision');
  return n;
}
function timestamp(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) throw new Error('Expected UTC timestamp');
  validateDate(value.slice(0,10));
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0,19) !== value.slice(0,19)) throw new Error('Invalid timestamp');
  return epoch;
}
// Structural validation accepts NULL for every source field; demo rules are separate.
export function validateSourceRow(input: unknown): asserts input is Reservation {
  if (!input || typeof input !== 'object') throw new Error('Expected source record');
  const row = input as Record<string, unknown>;
  if (Object.keys(row).length !== sourceSchema.length || sourceSchema.some(([k]) => !Object.hasOwn(row,k))) throw new Error('Expected exactly 13 source fields');
  for (const [key,type] of sourceSchema) {
    const v = row[key];
    if (v === null) continue;
    if (type === 'INT64' || type === 'FLOAT64') {
      if (typeof v !== 'number' || !Number.isFinite(v) || (type === 'INT64' && !Number.isSafeInteger(v))) throw new Error(`Invalid ${key}`);
    } else {
      if (typeof v !== 'string') throw new Error(`Invalid ${key}`);
      if (type === 'DATE') validateDate(v);
      if (type === 'TIMESTAMP') timestamp(v);
    }
  }
}
export function summarizeProfitroom(rows: readonly Reservation[]) {
  rows.forEach(validateSourceRow);
  const noCancellation = rows.filter(r => r['Data anulacji'] === null);
  return {total:rows.length, without_cancellation:noCancellation.length, cancelled:rows.length-noCancellation.length,
    channels:Object.fromEntries(channels.map(ch => [ch,rows.filter(r=>r['Kanał rezerwacji']===ch).length])),
    value_without_cancellation:noCancellation.some(r=>r['Wartość']===null) ? null :
      (noCancellation.reduce((s,r)=>s+moneyCents(r['Wartość']!),0)/100).toFixed(2)};
}
export function validateProfitroom(c: ScenarioConfig, rows: readonly Reservation[]): void {
  validateConfig(c);
  const days = new Set(calendar(c));
  rows.forEach(validateSourceRow);
  assertUnique(rows.map(r => r['Kod rezerwacji'] ?? ''));
  for (const r of rows) {
    if (sourceSchema.some(([k]) => k !== 'Data anulacji' && r[k] === null)) throw new Error('Incomplete baseline demo record');
    const d = r as DemoReservation;
    const created=timestamp(d['Data rezerwacji']), day=metricDate(d['Data rezerwacji']);
    const lead=(Date.parse(`${d['Data przyjazdu']}T00:00:00Z`)-Date.parse(`${day}T00:00:00Z`))/86400000;
    const length=nights(d)!;
    if (!days.has(day) || lead<1 || lead>90 || length<2 || length>5 || !Number.isInteger(length) ||
        d['Liczba pokoi']<1 || d['Liczba pokoi']>2) throw new Error('Invalid stay or booking window');
    if (!channels.some(ch=>ch===d['Kanał rezerwacji']) || !offers.some(o=>o===d.Oferta) || !roomTypes.some(t=>t===d['Typ pokoju']) ||
        !d['Kod rezerwacji'].startsWith('demo_reservation_') || d.Waluta!=='PLN') throw new Error('Invalid demo vocabulary');
    const value=moneyCents(d.Wartość), paid=moneyCents(d.Zapłacono), balance=moneyCents(d['Pozostało do zapłaty']);
    if (value<=0 || paid+balance!==value) throw new Error('Invalid payment balance');
    if (d['Data anulacji']!==null) {
      const cancelled=timestamp(d['Data anulacji']);
      if (cancelled<created || cancelled>Date.parse(scenarioAsOf(c)) || cancelled>Date.parse(warsawTimestamp(d['Data przyjazdu'],'12:00:00'))) throw new Error('Invalid cancellation');
    }
  }
  const s=summarizeProfitroom(rows);
  if (!withinTolerance(s.total,277) || !withinTolerance(s.without_cancellation,230) || !withinTolerance(s.cancelled,47,0.02,1) ||
      !withinTolerance(s.channels['Booking Engine'],37,0.02,1) || s.value_without_cancellation===null ||
      !withinTolerance(Number(s.value_without_cancellation),573062) || channels.some(ch=>!s.channels[ch])) throw new Error('Outside calibration tolerance');
}
export function generateProfitroom(c: ScenarioConfig): DemoReservation[] {
  validateConfig(c);
  const rng=(key:string)=>randomAt(c,PROFITROOM_VERSION,key);
  const total=Math.round(277*(0.99+rng('total')*0.02));
  const countsByChannel=largestRemainder(total,channels.map((key,i)=>({key,weight:[50,22,11][i]})));
  const labels=channels.flatMap((ch,i)=>Array.from({length:countsByChannel[i]},()=>ch));
  const order=Array.from({length:total},(_,i)=>i).sort((a,b)=>rng(`channel:${a}`)-rng(`channel:${b}`)||a-b);
  const cancelledIds=new Set([...order].sort((a,b)=>rng(`cancel:${a}`)-rng(`cancel:${b}`)||a-b).slice(0,47));
  const days=calendar(c), weights=sourceWeights(c,'profitroom');
  const counts=largestRemainder(total,days.map((key,i)=>({key,weight:weights[i]*rng(`day:${key}`)**2})));
  const dates=days.flatMap((d,i)=>Array.from({length:counts[i]},()=>d));
  const rows=dates.map((day,i):DemoReservation=>{
    const tier=Math.floor(rng(`room:${i}`)*roomTypes.length);
    const rooms=rng(`rooms:${i}`)<0.08 ? 2 : 1;
    const length=2+Math.floor(rng(`nights:${i}`)*4);
    const arrival=addDays(day,1+Math.floor(rng(`lead:${i}`)**2*90));
    const created=warsawTimestamp(day,`${String(7+Math.floor(rng(`hour:${i}`)*16)).padStart(2,'0')}:${String(Math.floor(rng(`minute:${i}`)*60)).padStart(2,'0')}:00`);
    const limit=Math.min(Date.parse(scenarioAsOf(c)),Date.parse(warsawTimestamp(arrival,'12:00:00')));
    const base=Math.round(length*rooms*(50000+(tier+1)*6500)*(0.85+rng(`rate:${i}`)*0.3));
    return {'Data rezerwacji':created,'Kod rezerwacji':syntheticId(c,'reservation',PROFITROOM_VERSION,i),
      'Kanał rezerwacji':labels[order.indexOf(i)],'Oferta':offers[Math.floor(rng(`offer:${i}`)*offers.length)],
      'Typ pokoju':roomTypes[tier],'Liczba pokoi':rooms,'Data przyjazdu':arrival,'Data wyjazdu':addDays(arrival,length),
      'Data anulacji':cancelledIds.has(i) ? new Date(Date.parse(created)+Math.floor((limit-Date.parse(created))*rng(`cancel-time:${i}`))).toISOString() : null,
      'Wartość':base/100,'Zapłacono':0,'Pozostało do zapłaty':base/100,'Waluta':'PLN'};
  });
  const measured=rows.filter(r=>r['Data anulacji']===null);
  const current=measured.reduce((s,r)=>s+moneyCents(r.Wartość),0);
  if (!withinTolerance(current,57306200)) {
    const desired=Math.round(57306200*(0.99+rng('value-scale')*0.02));
    if (desired/current<0.8 || desired/current>1.2) throw new Error('Unrealistic price correction');
    const money=allocateMoney(desired,measured.map(r=>({key:r['Kod rezerwacji'],weight:moneyCents(r.Wartość)})));
    measured.forEach((r,i)=>{r.Wartość=Number(money[i]);});
  }
  // Payment state, not a refund ledger: zero, deposit or full payment, including cancellations.
  // Allocate AFTER value correction so that cent-exact balance is preserved.
  rows.forEach((r,i)=>{
    const fractions=r['Data anulacji']===null ? [0,0.3,0.5,1] : [0,0.3,0.5];
    const value=moneyCents(r.Wartość);
    const paid=Math.round(value*fractions[Math.floor(rng(`payment:${i}`)*fractions.length)]);
    r.Zapłacono=paid/100; r['Pozostało do zapłaty']=(value-paid)/100;
  });
  rows.sort((a,b)=>{
    const da=metricDate(a['Data rezerwacji']), db=metricDate(b['Data rezerwacji']);
    return da<db ? -1 : da>db ? 1 : a['Kod rezerwacji']<b['Kod rezerwacji'] ? -1 : a['Kod rezerwacji']>b['Kod rezerwacji'] ? 1 : 0;
  });
  validateProfitroom(c,rows);
  return rows;
}
// JSON.stringify replacer preserves source ordinal order rather than sorting Polish keys.
export function serializeProfitroom(rows: readonly Reservation[]): string {
  rows.forEach(validateSourceRow);
  return rows.map(r=>JSON.stringify(r,sourceSchema.map(([k])=>k))).join('\n')+(rows.length?'\n':'');
}
export async function exportProfitroom(c: ScenarioConfig, directory:string) {
  const rows=generateProfitroom(c), data=serializeProfitroom(rows);
  const manifest={...buildManifest(c,[describeArtifact('profitroom.ndjson',Buffer.from(data))]),
    source_generator_version:PROFITROOM_VERSION, source_schema:'profitroom-source-13-v1',
    snapshot_as_of_at:scenarioAsOf(c), summary:summarizeProfitroom(rows)};
  await mkdir(directory);
  await writeFile(join(directory,'profitroom.ndjson'),data,{flag:'wx'});
  await writeFile(join(directory,'manifest.json'),serializeManifest(manifest),{flag:'wx'});
  return manifest;
}
