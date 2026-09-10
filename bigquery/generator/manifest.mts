import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { validateConfig, type ScenarioConfig } from './config.mts';
import { hash, canonical } from './random.mts';
import { snapshotLoadedAt } from './time.mts';
import { assertUnique } from './allocation.mts';
export interface Artifact { path: string; status: 'planned' | 'present'; sha256: string | null; bytes: number | null }
export function describeArtifact(path: string, content?: Uint8Array): Artifact {
  if (!path || isAbsolute(path) || path.split(/[\\/]/).includes('..')) throw new Error('Use a safe relative artifact path');
  return { path, status: content === undefined ? 'planned' : 'present',
    sha256: content === undefined ? null : createHash('sha256').update(content).digest('hex'),
    bytes: content?.byteLength ?? null };
}
// Explicit read only. Missing files are errors, not silently labelled planned.
export async function inspectArtifact(file: string, relativeName: string): Promise<Artifact> {
  return describeArtifact(relativeName, await readFile(file));
}
export function buildManifest(c: ScenarioConfig, artifacts: readonly Artifact[] = []) {
  validateConfig(c);
  assertUnique(artifacts.map(a => a.path));
  for (const a of artifacts) {
    describeArtifact(a.path);
    if (a.status === 'present') {
      if (!a.sha256 || !/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isSafeInteger(a.bytes) || a.bytes! < 0) throw new Error('Invalid present artifact');
    } else if (a.status !== 'planned' || a.sha256 !== null || a.bytes !== null) throw new Error('Invalid planned artifact');
  }
  return {
    scenario_id: c.scenario_id, scenario_version: c.scenario_version,
    generator_version: c.generator_version, contract_version: c.contract_version,
    seed: c.seed, start_date: c.start_date, days: c.days,
    hotel_id: c.hotel_id, currency_code: c.currency_code, timezone: c.timezone,
    generated_at: snapshotLoadedAt(c), config_hash: hash(c),
    artifacts: artifacts.map(a => ({ ...a })).sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  };
}
export function serializeManifest(manifest: ReturnType<typeof buildManifest>): string { return canonical(manifest) + '\n'; }
