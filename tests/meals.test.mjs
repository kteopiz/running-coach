import test from "node:test";
import assert from "node:assert/strict";
import { validateMealFields } from "../src/lib/meals.js";
import { localDate } from "../src/lib/runValidation.js";

test("meal fields follow the selected date", () => {
  const today = localDate();
  const valid = { date: today, time: "08:15", kind: "breakfast", description: "Oatmeal", calories: 400 };
  assert.deepEqual(validateMealFields(valid), {});
  assert.ok(validateMealFields({ ...valid, date: "2026-02-31" }).date);
  assert.ok(validateMealFields({ ...valid, date: "2026-01-01", time: "24:00" }, "2026-01-01").time);
  assert.ok(validateMealFields({ ...valid, kind: "brunch" }).kind);
  assert.ok(validateMealFields({ ...valid, description: "   " }).description);
  assert.ok(validateMealFields({ ...valid, calories: 0 }).calories);
  assert.ok(validateMealFields({ ...valid, calories: 10.5 }).calories);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.ok(validateMealFields({ ...valid, date: localDate(tomorrow) }).date);
});
