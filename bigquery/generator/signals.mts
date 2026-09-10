import type { ScenarioConfig } from './config.mts';
import { calendar } from './time.mts';
import { randomAt } from './random.mts';
import { clamp } from './allocation.mts';
export interface DailySignal {
  metric_date: string; weekend: boolean; trend: number; seasonality: number;
  spike: number; noise: number; demand: number;
}
export function dailySignals(c: ScenarioConfig): DailySignal[] {
  const center = 10 + Math.floor(randomAt(c, 'common:signals', 'peak') * 70);
  let previous = 0;
  return calendar(c).map((date, i) => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const trend = 0.08 * i / (c.days - 1);
    // Synthetic within-window seasonality; not a claim about actual hotel weather/demand.
    const seasonality = 0.12 * Math.sin(Math.PI * i / (c.days - 1));
    const spike = 0.18 * Math.exp(-((i - center) ** 2) / 18);
    previous = clamp(0.45 * previous + (randomAt(c, 'common:signals', date) - 0.5) * 0.24, -0.2, 0.2);
    return { metric_date: date, weekend, trend, seasonality, spike, noise: previous,
      demand: clamp(Math.exp(trend + seasonality + spike + previous + (weekend ? 0.07 : -0.028)), 0.6, 1.7) };
  });
}
export function sourceWeights(c: ScenarioConfig, namespace: string): number[] {
  if (!namespace.trim() || namespace === 'common') throw new Error('Source namespace required');
  return dailySignals(c).map(d => clamp(d.demand * Math.exp((randomAt(c, `source:${namespace}`, d.metric_date) - 0.5) * 0.5), 0.4, 2.2));
}
