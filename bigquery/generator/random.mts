import { createHash } from 'node:crypto';
import { validateConfig, type ScenarioConfig } from './config.mts';

export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  throw new Error('Only finite JSON values are supported');
}
export function hash(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
// Indexed draws: callers choose stable namespace/key, never depend on global call order.
export function randomAt(c: ScenarioConfig, namespace: string, key: string | number): number {
  validateConfig(c);
  if (!namespace || (typeof key === 'number' && !Number.isSafeInteger(key))) throw new Error('Invalid random key');
  return Number.parseInt(hash(['rng-v1', c, namespace, key]).slice(0, 13), 16) / 2 ** 52;
}
export function randomStream(c: ScenarioConfig, namespace: string): () => number {
  // Snapshot prevents external mutation from changing a running stream.
  const copy = structuredClone(c);
  let index = 0;
  return () => randomAt(copy, namespace, index++);
}
export type IdKind = 'scenario' | 'batch' | 'hotel' | 'account' | 'customer' | 'campaign' | 'reservation' | 'ga4_user' | 'ga4_session';
export function syntheticId(c: ScenarioConfig, kind: IdKind, namespace: string, index: string | number): string {
  validateConfig(c);
  if (kind === 'hotel') return c.hotel_id;
  if (kind === 'scenario') return c.scenario_id;
  return `demo_${kind}_${hash(['id-v1', c, namespace, index, kind]).slice(0, 32)}`;
}
// GA4 INT64-compatible decimal string; avoid loss of precision in JSON consumers.
export function ga4SessionId(c: ScenarioConfig, namespace: string, index: number): string {
  validateConfig(c);
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('Invalid session index');
  return (BigInt(`0x${hash(['session-v1', c, namespace, index]).slice(0, 15)}`) + 1n).toString();
}
