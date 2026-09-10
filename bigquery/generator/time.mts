import { validateConfig, validateDate, type ScenarioConfig } from './config.mts';

export function addDays(date: string, days: number): string {
  validateDate(date);
  if (!Number.isSafeInteger(days)) throw new Error('Invalid day offset');
  const result = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  validateDate(result);
  return result;
}
export function calendar(c: ScenarioConfig): string[] {
  validateConfig(c);
  return Array.from({ length: c.days }, (_, i) => addDays(c.start_date, i));
}
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function localParts(epoch: number): string {
  const p = Object.fromEntries(formatter.formatToParts(epoch).map(p => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
export function metricDate(timestamp: string): string {
  if (!/Z$|[+-]\d\d:\d\d$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) throw new Error('Timestamp requires explicit offset');
  return localParts(Date.parse(timestamp)).slice(0, 10);
}
// For the supported modern Warsaw calendar, possible UTC offsets are +01 and +02.
// DST gaps fail; overlaps require an explicit choice instead of silently guessing.
export function warsawTimestamp(date: string, time: string, overlap?: 'earlier' | 'later'): string {
  validateDate(date);
  if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) throw new Error('Invalid local time');
  const local = `${date}T${time}`;
  const base = Date.parse(`${local}Z`);
  const matches = [base - 7200000, base - 3600000].filter(t => localParts(t) === local);
  if (!matches.length) throw new Error('Nonexistent Warsaw time');
  if (matches.length > 1 && !overlap) throw new Error('Ambiguous Warsaw time');
  return new Date(overlap === 'later' ? matches.at(-1)! : matches[0]).toISOString();
}
export function scenarioAsOf(c: ScenarioConfig): string {
  validateConfig(c);
  return warsawTimestamp(addDays(c.start_date, c.days), '08:00:00');
}
export function loadedAt(c: ScenarioConfig, metricDay: string): string {
  if (!calendar(c).includes(metricDay)) throw new Error('Day outside reporting window');
  return `${addDays(metricDay, 1)}T06:00:00.000Z`;
}
// Current-state snapshot can include cancellations after its original creation day.
export function snapshotLoadedAt(c: ScenarioConfig): string {
  const lastDaily = loadedAt(c, calendar(c).at(-1)!);
  const asOf = scenarioAsOf(c);
  return Date.parse(lastDaily) >= Date.parse(asOf) ? lastDaily : asOf;
}
