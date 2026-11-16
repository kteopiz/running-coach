import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("profile has one calorie editor and meal setup prompt follows the active goal", async (t) => {
  const previousDocument = globalThis.document;
  globalThis.document = { documentElement: { dataset: { theme: "dark" } } };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const { default: Profile } = await vite.ssrLoadModule("/src/pages/Profile.jsx");
    const { default: MealLog } = await vite.ssrLoadModule("/src/components/MealLog.jsx");
    const user = { name: "Alex", email: "alex@example.com", age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, dailyCalorieGoal: 2200 };
    const profile = renderToStaticMarkup(createElement(Profile, { user }));
    assert.equal((profile.match(/name="dailyCalorieGoal"/g) || []).length, 1);
    assert.doesNotMatch(profile, /Save calorie goal|name="calories"/);
    assert.match(profile, /<details[^>]*><summary>Calorie goal history/);
    assert.doesNotMatch(renderToStaticMarkup(createElement(MealLog, { user })), /Set calorie goal/);
    assert.match(renderToStaticMarkup(createElement(MealLog, { user: { ...user, dailyCalorieGoal: null } })), /Set calorie goal/);
  } finally { await vite.close(); }
});
