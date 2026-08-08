import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateChannelShare,
  calculateCostPerBooking,
  calculatePercentChange,
  calculateRoas,
  calculateTotalSales,
} from "./marketing-metrics.ts";

const currentSales = [
  { bookings: 73, revenue: 178000 },
  { bookings: 92, revenue: 201000 },
  { bookings: 24, revenue: 49000 },
  { bookings: 31, revenue: 75000 },
  { bookings: 18, revenue: 46000 },
];

const comparisonSales = [
  { bookings: 64, revenue: 151000 },
  { bookings: 83, revenue: 178000 },
  { bookings: 23, revenue: 46000 },
  { bookings: 27, revenue: 63000 },
  { bookings: 17, revenue: 41000 },
];

test("calculates Meta ROAS from revenue and spend", () => {
  assert.equal(calculateRoas(8100, 5600)?.toFixed(2), "1.45");
  assert.equal(calculateRoas(8800, 6000)?.toFixed(2), "1.47");
  assert.equal(calculateRoas(100, 0), null);
});

test("calculates cost per booking", () => {
  assert.equal(calculateCostPerBooking(6000, 4), 1500);
  assert.equal(calculateCostPerBooking(6000, 0), null);
});

test("calculates percent change without inventing a zero baseline", () => {
  assert.equal(calculatePercentChange(110, 100), 10);
  assert.equal(calculatePercentChange(0, 0), 0);
  assert.equal(calculatePercentChange(10, 0), null);
});

test("totals current hotel sales", () => {
  assert.deepEqual(calculateTotalSales(currentSales), {
    bookings: 238,
    revenue: 549000,
  });
});

test("totals comparison hotel sales", () => {
  assert.deepEqual(calculateTotalSales(comparisonSales), {
    bookings: 214,
    revenue: 479000,
  });
});

test("calculates channel share", () => {
  assert.equal(calculateChannelShare(73, 238), (73 / 238) * 100);
  assert.equal(calculateChannelShare(0, 0), null);
});
