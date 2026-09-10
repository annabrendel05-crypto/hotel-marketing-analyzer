export interface ScenarioConfig {
  scenario_id: string;
  scenario_version: string;
  generator_version: string;
  contract_version: string;
  seed: string;
  start_date: string;
  days: 90;
  hotel_id: string;
  currency_code: 'PLN';
  timezone: 'Europe/Warsaw';
  tolerances: { relative: number; percentage_points: number };
}

export function validateDate(date: string): void {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Expected a real date in 2000–2099');
  }
}

export function validateConfig(input: unknown): asserts input is ScenarioConfig {
  if (!input || typeof input !== 'object') throw new Error('Configuration required');
  const c = input as Record<string, unknown>;
  for (const key of ['scenario_id', 'scenario_version', 'generator_version', 'contract_version', 'seed', 'start_date', 'hotel_id']) {
    if (typeof c[key] !== 'string' || !(c[key] as string).trim()) throw new Error(`Required: ${key}`);
  }
  validateDate(c.start_date as string);
  if (c.days !== 90 || c.currency_code !== 'PLN' || c.timezone !== 'Europe/Warsaw') throw new Error('Expected 90 days, PLN, Europe/Warsaw');
  const t = c.tolerances as ScenarioConfig['tolerances'] | undefined;
  if (!t || t.relative !== 0.02 || t.percentage_points !== 2) throw new Error('Baseline tolerances must be 0.02 and 2 pp; exceptions require explicit validation rules');
}
