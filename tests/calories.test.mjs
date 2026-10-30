import test from "node:test";
import assert from "node:assert/strict";
import { calorieInputs, estimateDailyCalories } from "../src/lib/calories.js";

const alex = { age: 25, heightInches: 67, weightLb: 145, weeklyMileageGoal: 15 };

test("calorie estimate accepts valid profile and running-goal inputs", () => {
  const inputs = calorieInputs(alex);
  assert.deepEqual(inputs, alex);
  assert.equal(calorieInputs({ ...alex, height: 67, weight: 145, heightInches: undefined, weightLb: undefined }).heightInches, 67);
  assert.equal(calorieInputs({ ...alex, age: 25.5 }), null);
  assert.equal(calorieInputs({ ...alex, heightInches: 0 }), null);
  assert.equal(calorieInputs({ ...alex, weightLb: -1 }), null);
  assert.equal(calorieInputs({ ...alex, weeklyMileageGoal: 0 }), null);
  assert.equal(calorieInputs({ ...alex, weeklyMileageGoal: null }), null);
});

test("daily calorie estimate is a labelled educational total", () => {
  const estimate = estimateDailyCalories(alex);
  assert.equal(estimate.label, "Educational estimate");
  assert.equal(estimate.inputs.weeklyMileageGoal, 15);
  assert.equal(estimate.calories, estimate.restingCalories + estimate.runningCalories);
  assert.ok(estimate.restingCalories > 1000);
  assert.ok(estimate.runningCalories > 0);
  assert.ok(estimateDailyCalories({ ...alex, weeklyMileageGoal: 30 }).runningCalories > estimate.runningCalories);
  assert.equal(estimateDailyCalories({ age: 30, height: 70, weight: 170 }), null);
});
