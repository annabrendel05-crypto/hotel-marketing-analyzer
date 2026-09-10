export function nonnegative(n: number): number {
  if (!Number.isFinite(n) || n < 0) throw new Error('Expected finite nonnegative value');
  return n;
}
export function clamp(n: number, min: number, max: number): number {
  if (![n, min, max].every(Number.isFinite) || min > max) throw new Error('Invalid clamp bounds');
  return Math.min(max, Math.max(min, n));
}
export interface Cell { key: string; weight: number; allowed?: boolean; capacity?: number }
function validate(cells: readonly Cell[]): void {
  if (new Set(cells.map(c => c.key)).size !== cells.length) throw new Error('Duplicate cell key');
  for (const c of cells) {
    if (!c.key) throw new Error('Cell key required');
    nonnegative(c.weight);
    if (c.capacity !== undefined && (!Number.isSafeInteger(c.capacity) || c.capacity < 0)) throw new Error('Invalid capacity');
  }
}
export function normalizeWeights(cells: readonly Cell[]): number[] {
  validate(cells);
  const max = cells.reduce((max, c) => c.allowed === false ? max : Math.max(max, c.weight), 0);
  if (max === 0) return cells.map(() => 0);
  const weights = cells.map(c => c.allowed === false ? 0 : c.weight / max);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}
// Stable largest remainders with capacities. Integer arithmetic for target/residues.
// Relative weights are quantized to 1e-9; smaller weights are treated as zero.
export function largestRemainder(total: number, cells: readonly Cell[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Invalid integer target');
  validate(cells);
  const out = cells.map(() => 0);
  if (total === 0) return out;
  let remaining = total;
  while (remaining > 0) {
    // Only remaining capacity participates in normalization and quantization.
    const weights = normalizeWeights(cells.map((c, i) => ({
      ...c, allowed: c.allowed !== false && out[i] < (c.capacity ?? total),
    }))).map(w => BigInt(Math.round(w * 1e9)));
    const eligible = cells.map((c, i) => ({ i, c })).filter(({i,c}) => c.allowed !== false && weights[i] > 0n && out[i] < (c.capacity ?? total));
    const sum = eligible.reduce((s, {i}) => s + weights[i], 0n);
    if (sum === 0n) throw new Error('Positive target without available weighted capacity');
    const shares = eligible.map(({i,c}) => {
      const numerator = BigInt(remaining) * weights[i];
      const count = Math.min(Number(numerator / sum), (c.capacity ?? total) - out[i]);
      return { i, key: c.key, count, residue: numerator % sum };
    });
    for (const share of shares) { out[share.i] += share.count; remaining -= share.count; }
    shares.sort((a,b) => a.residue === b.residue ? (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) : a.residue > b.residue ? -1 : 1);
    for (const {i} of shares) {
      if (remaining && out[i] < (cells[i].capacity ?? total)) { out[i]++; remaining--; }
    }
  }
  return out;
}
export function weightedAllocation(total: number, cells: readonly Cell[]): number[] {
  nonnegative(total);
  const weights = normalizeWeights(cells);
  if (total > 0 && !weights.some(w => w > 0)) throw new Error('No allowed positive weights');
  if (cells.some(c => c.capacity !== undefined)) throw new Error('Use largestRemainder for capacity-constrained allocation');
  return weights.map(w => total * w);
}
export function allocateMoney(totalCents: number, cells: readonly Cell[]): string[] {
  return largestRemainder(totalCents, cells).map(c => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`);
}
export function withinTolerance(actual: number, target: number, relative = 0.02, absolute?: number): boolean {
  [actual, target, relative].forEach(nonnegative);
  if (absolute !== undefined) nonnegative(absolute);
  return Math.abs(actual - target) <= (absolute ?? target * relative) + Number.EPSILON * Math.max(actual, target, 1);
}
export function withinShareTolerance(actualPct: number, targetPct: number, pp = 2): boolean {
  if (actualPct > 100 || targetPct > 100) throw new Error('Share must be in 0..100');
  return withinTolerance(actualPct, targetPct, 0, pp);
}
export function assertUnique(ids: readonly string[]): void {
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Empty or duplicate ID');
}
export interface PurchaseCell extends Cell { purchases: number | null; valueMeasured: boolean }
export function validatePurchaseValues(cells: readonly PurchaseCell[], values: readonly (string | null)[]): void {
  if (cells.length !== values.length) throw new Error('Length mismatch');
  cells.forEach((c,i) => {
    if (c.purchases !== null) nonnegative(c.purchases);
    const v = values[i];
    if (v !== null && !/^\d+\.\d{2}$/.test(v)) throw new Error('Expected nonnegative decimal money');
    if ((!c.valueMeasured || c.purchases === null) && v !== null) throw new Error('Missing measurement must stay NULL');
    if (v !== null && Number(v) > 0 && (c.purchases === null || c.purchases <= 0 || c.allowed === false)) throw new Error('Value requires positive allowed purchase credit');
  });
}
// Caller supplies credit for ONE canonical action and ONE compatible reporting policy.
export function allocatePurchaseValues(totalCents: number | null, cells: readonly PurchaseCell[]): (string | null)[] {
  validate(cells);
  cells.forEach(c => { if (c.purchases !== null) nonnegative(c.purchases); });
  if (totalCents === null) return cells.map(() => null);
  const allocated = allocateMoney(totalCents, cells.map(c => ({ ...c, allowed: c.allowed !== false && c.valueMeasured && c.purchases !== null && c.purchases > 0 })));
  const result = allocated.map((v,i) => !cells[i].valueMeasured || cells[i].purchases === null ? null : v);
  validatePurchaseValues(cells, result);
  return result;
}
