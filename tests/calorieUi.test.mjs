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
    const metricUser = { ...user, unitSystem: "metric" };
    const metricProfile = renderToStaticMarkup(createElement(Profile, { user: metricUser }));
    assert.match(metricProfile, /Height \(cm\)/);
    assert.match(metricProfile, /Weekly mileage goal \(km\)/);
    assert.equal((metricProfile.match(/name="dailyCalorieGoal"/g) || []).length, 1);
    assert.doesNotMatch(metricProfile, /Save calorie goal|Goal on this date/);
    const { default: Dashboard } = await vite.ssrLoadModule("/src/pages/Dashboard.jsx");
    const dashboard = renderToStaticMarkup(createElement(Dashboard, { user: metricUser }));
    assert.match(dashboard, /Sunday – Saturday · Kilometers/);
    assert.match(dashboard, /170\.2 cm/);
    assert.doesNotMatch(dashboard, /Monday – Sunday/);
    assert.doesNotMatch(renderToStaticMarkup(createElement(MealLog, { user })), /Set calorie goal/);
    assert.match(renderToStaticMarkup(createElement(MealLog, { user: { ...user, dailyCalorieGoal: null } })), /Set calorie goal/);
  } finally { await vite.close(); }
});
