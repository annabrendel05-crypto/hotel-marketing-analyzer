import assert from "node:assert/strict";
import test from "node:test";

import { checkCampaignDataSufficiency } from "./campaign-data-sufficiency.ts";

test("spend = 150 and sessions = 0 is sufficient", () => {
  assert.equal(checkCampaignDataSufficiency(150, 0), "SUFFICIENT_DATA");
});

test("spend = 0 and sessions = 150 is sufficient", () => {
  assert.equal(checkCampaignDataSufficiency(0, 150), "SUFFICIENT_DATA");
});

test("spend = 150 and sessions = 150 is sufficient", () => {
  assert.equal(checkCampaignDataSufficiency(150, 150), "SUFFICIENT_DATA");
});

test("spend = 149.99 and sessions = 149 is insufficient", () => {
  assert.equal(
    checkCampaignDataSufficiency(149.99, 149),
    "INSUFFICIENT_DATA",
  );
});

test("spend = 0 and sessions = 0 is insufficient", () => {
  assert.equal(checkCampaignDataSufficiency(0, 0), "INSUFFICIENT_DATA");
});

test("very high valid values are sufficient", () => {
  assert.equal(
    checkCampaignDataSufficiency(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    "SUFFICIENT_DATA",
  );
});

test("negative values do not satisfy either threshold", () => {
  assert.equal(checkCampaignDataSufficiency(-1, -1), "INSUFFICIENT_DATA");
  assert.equal(checkCampaignDataSufficiency(-150, -150), "INSUFFICIENT_DATA");
});

test("NaN does not satisfy either threshold", () => {
  assert.equal(checkCampaignDataSufficiency(Number.NaN, Number.NaN), "INSUFFICIENT_DATA");
});

test("NaN in one field does not block a sufficient value in the other field", () => {
  assert.equal(checkCampaignDataSufficiency(Number.NaN, 150), "SUFFICIENT_DATA");
  assert.equal(checkCampaignDataSufficiency(150, Number.NaN), "SUFFICIENT_DATA");
});

test("positive Infinity satisfies a threshold", () => {
  assert.equal(
    checkCampaignDataSufficiency(Number.POSITIVE_INFINITY, 0),
    "SUFFICIENT_DATA",
  );
  assert.equal(
    checkCampaignDataSufficiency(0, Number.POSITIVE_INFINITY),
    "SUFFICIENT_DATA",
  );
});

test("negative Infinity does not satisfy a threshold", () => {
  assert.equal(
    checkCampaignDataSufficiency(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY),
    "INSUFFICIENT_DATA",
  );
});

test("repeated calls with the same data return the same result", () => {
  const results = Array.from({ length: 100 }, () =>
    checkCampaignDataSufficiency(149.99, 150),
  );

  assert.deepEqual(results, Array(100).fill("SUFFICIENT_DATA"));
});

test("meeting only the spend condition is sufficient", () => {
  assert.equal(checkCampaignDataSufficiency(150, 149), "SUFFICIENT_DATA");
});

test("meeting only the sessions condition is sufficient", () => {
  assert.equal(checkCampaignDataSufficiency(149.99, 150), "SUFFICIENT_DATA");
});

test("values immediately below and exactly on both boundaries are distinguished", () => {
  assert.equal(
    checkCampaignDataSufficiency(149.999999, 149.999999),
    "INSUFFICIENT_DATA",
  );
  assert.equal(checkCampaignDataSufficiency(150, 150), "SUFFICIENT_DATA");
});
