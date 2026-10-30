import test from "node:test";
import assert from "node:assert/strict";
import { calorieInputs } from "../src/lib/calories.js";

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
