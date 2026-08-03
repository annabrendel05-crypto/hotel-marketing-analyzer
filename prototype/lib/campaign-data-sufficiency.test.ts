import assert from "node:assert/strict";
import test from "node:test";

import { checkCampaignDataSufficiency } from "./campaign-data-sufficiency.ts";

test("returns SUFFICIENT_DATA when spend reaches the threshold", () => {
  assert.equal(checkCampaignDataSufficiency(150, 0), "SUFFICIENT_DATA");
});

test("returns SUFFICIENT_DATA when sessions reach the threshold", () => {
  assert.equal(checkCampaignDataSufficiency(0, 150), "SUFFICIENT_DATA");
});

test("uses OR when only spend exceeds the threshold", () => {
  assert.equal(checkCampaignDataSufficiency(200, 149), "SUFFICIENT_DATA");
});

test("uses OR when only sessions exceed the threshold", () => {
  assert.equal(checkCampaignDataSufficiency(149.99, 200), "SUFFICIENT_DATA");
});

test("returns SUFFICIENT_DATA when both thresholds are met", () => {
  assert.equal(checkCampaignDataSufficiency(150, 150), "SUFFICIENT_DATA");
});

test("returns INSUFFICIENT_DATA when both values are below their thresholds", () => {
  assert.equal(
    checkCampaignDataSufficiency(149.99, 149),
    "INSUFFICIENT_DATA",
  );
});
