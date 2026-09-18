export function pctChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return null;

  return ((current - previous) / previous) * 100;
}

export function safeRate(
  part: number,
  total: number
): number | null {
  if (total === 0) return null;

  return part / total;
}

export function percentagePointChange(
  currentRate: number | null,
  previousRate: number | null
): number | null {
  if (currentRate === null || previousRate === null) {
    return null;
  }

  return (currentRate - previousRate) * 100;
}

export function average(
  total: number,
  count: number
): number | null {
  if (count === 0) return null;

  return total / count;
}
