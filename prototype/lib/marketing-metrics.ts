export type SalesMetric = {
  bookings: number;
  revenue: number;
};

export function calculateRoas(revenue: number, spend: number): number | null {
  return spend > 0 ? revenue / spend : null;
}

export function calculateCostPerBooking(
  spend: number,
  bookings: number,
): number | null {
  return bookings > 0 ? spend / bookings : null;
}

export function calculatePercentChange(
  current: number,
  comparison: number,
): number | null {
  if (comparison === 0) return current === 0 ? 0 : null;
  return ((current - comparison) / comparison) * 100;
}

export function calculateTotalSales(metrics: SalesMetric[]): SalesMetric {
  return metrics.reduce(
    (total, metric) => ({
      bookings: total.bookings + metric.bookings,
      revenue: total.revenue + metric.revenue,
    }),
    { bookings: 0, revenue: 0 },
  );
}

export function calculateChannelShare(
  channelValue: number,
  totalValue: number,
): number | null {
  return totalValue > 0 ? (channelValue / totalValue) * 100 : null;
}
