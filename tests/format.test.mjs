import test from "node:test";
import assert from "node:assert/strict";
import { formatCalories, formatGrouped, formatMiles } from "../src/lib/format.js";

test("mileage and calorie totals use thousands separators without losing tenths", () => {
  assert.equal(formatMiles(0), "0");
  assert.equal(formatMiles(0.04), "<0.1");
  assert.equal(formatMiles(3.7), "3.7");
  assert.equal(formatMiles(15), "15");
  assert.equal(formatMiles(1000), "1,000");
  assert.equal(formatMiles(1000.46), "1,000.5");
  assert.equal(formatCalories(1714), "1,714");
  assert.equal(formatCalories(10000), "10,000");
  assert.equal(formatGrouped(2000), "2,000");
});
