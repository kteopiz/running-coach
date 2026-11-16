import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";
import {
  convertDistanceEntry,
  convertHeightEntry,
  distanceFieldLabel,
  distanceHeading,
  distanceInputValue,
  distanceUnitShort,
  formatDistanceAmount,
  formatHeight,
  heightFieldsFromInches,
  inchesFromHeightEntry,
  milesFromDistanceEntry,
  recommendationText,
  weeklyGoalLabel,
} from "../src/lib/units.js";

test("height and distance round trip between imperial and metric", () => {
  for (const inches of [67, 70, 60, 66.5]) {
    const imperial = heightFieldsFromInches(inches, "imperial");
    assert.equal(inchesFromHeightEntry({ unitSystem: "imperial", feet: imperial.feet, inches: imperial.inches }).inches, inches);
    const metric = heightFieldsFromInches(inches, "metric");
    assert.equal(inchesFromHeightEntry({ unitSystem: "metric", centimeters: metric.centimeters }).inches, inches);
    const switched = convertHeightEntry({ unitSystem: "imperial", feet: imperial.feet, inches: imperial.inches }, "metric");
    assert.equal(inchesFromHeightEntry({ unitSystem: "metric", centimeters: switched.centimeters }).inches, inches);
    const back = convertHeightEntry({ unitSystem: "metric", centimeters: switched.centimeters }, "imperial");
    assert.equal(inchesFromHeightEntry({ unitSystem: "imperial", feet: back.feet, inches: back.inches }).inches, inches);
  }
  assert.equal(inchesFromHeightEntry({ unitSystem: "imperial", feet: "5", inches: "7" }).inches, 67);
  assert.equal(formatHeight(67, "imperial"), "5 ft 7 in");
  assert.equal(formatHeight(67, "metric"), "170.2 cm");

  for (const miles of [15, 3.5, 4, 3, 2, 1, 0.5]) {
    const shown = distanceInputValue(miles, "metric");
    assert.equal(milesFromDistanceEntry(shown, "metric").miles, miles);
    assert.equal(formatDistanceAmount(miles, "metric"), shown);
    assert.equal(convertDistanceEntry(String(miles), "imperial", "metric").value, shown);
    assert.equal(convertDistanceEntry(shown, "metric", "imperial").miles, miles);
  }
});

test("blank and invalid unit entries are rejected", () => {
  assert.equal(inchesFromHeightEntry({ unitSystem: "metric", centimeters: "" }).error, "Enter a height in centimeters.");
  assert.equal(inchesFromHeightEntry({ unitSystem: "metric", centimeters: "   " }).error, "Enter a height in centimeters.");
  assert.equal(inchesFromHeightEntry({ unitSystem: "imperial", feet: "", inches: "" }).error, "Enter height in feet and inches.");
  assert.equal(inchesFromHeightEntry({ unitSystem: "imperial", feet: "5", inches: "" }).error, "Enter height in feet and inches.");
  assert.ok(inchesFromHeightEntry({ unitSystem: "imperial", feet: "5", inches: "12" }).error);
  assert.ok(inchesFromHeightEntry({ unitSystem: "imperial", feet: "0", inches: "0" }).error);
  assert.equal(inchesFromHeightEntry({ unitSystem: "metric", centimeters: "1" }).error, "Height must be at least 2.5 cm.");
  assert.equal(milesFromDistanceEntry("", "imperial").error, "Enter a distance in miles.");
  assert.equal(milesFromDistanceEntry("   ", "metric").error, "Enter a distance in kilometers.");
  assert.equal(milesFromDistanceEntry("0", "metric").error, "Distance must be a positive number.");
  assert.equal(milesFromDistanceEntry("-2", "imperial").error, "Distance must be a positive number.");
  assert.equal(convertHeightEntry({ unitSystem: "imperial", feet: "", inches: "" }, "metric").centimeters, "");
});

test("profile, run, and week labels use the same unit", () => {
  assert.equal(distanceFieldLabel("imperial"), "Distance (miles)");
  assert.equal(weeklyGoalLabel("imperial"), "Weekly mileage goal (miles)");
  assert.equal(distanceHeading("imperial"), "Miles");
  assert.equal(distanceUnitShort("imperial"), "mi");
  assert.equal(distanceFieldLabel("metric"), "Distance (km)");
  assert.equal(weeklyGoalLabel("metric"), "Weekly mileage goal (km)");
  assert.equal(distanceHeading("metric"), "Kilometers");
  assert.equal(distanceUnitShort("metric"), "km");
  assert.equal(formatDistanceAmount(15, "imperial"), distanceInputValue(15, "imperial"));
  assert.equal(
    recommendationText({ todayMiles: 3.7, message: "Keep any further running to 3.7 miles." }, "metric"),
    `Keep any further running to ${formatDistanceAmount(3.7, "metric")} km.`,
  );
  assert.match(
    recommendationText({ todayMiles: 0, message: "Today’s bounded distance is less than 0.1 miles. Rest today; your weekly goal is not yet complete." }, "metric"),
    /0\.16 km/,
  );
});

test("unit preference persists and stored inches and miles stay canonical", async () => {
  const db = openDatabase(":memory:");
  initializeDatabase(db);
  const server = createApi(db);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = "";
  const request = async (path, method = "GET", body) => {
    const response = await fetch(url + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: response.status, ...await response.json() };
  };
  try {
    const login = await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    assert.equal(login.user.unitSystem, "imperial");
    assert.equal(login.user.height, 67);
    const metric = await request("/profile", "PATCH", {
      age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, unitSystem: "metric",
    });
    assert.equal(metric.user.unitSystem, "metric");
    assert.equal(metric.user.height, 67);
    assert.equal(metric.user.weeklyMileageGoal, 15);
    const kept = await request("/profile", "PATCH", { age: 25, height: 67, weight: 145, weeklyMileageGoal: 15 });
    assert.equal(kept.user.unitSystem, "metric");
    assert.equal((await request("/profile", "PATCH", {
      age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, unitSystem: "stones",
    })).status, 400);
    assert.equal((await request("/session")).user.unitSystem, "metric");
    cookie = "";
    const registered = await request("/register", "POST", {
      name: "Metric Runner", email: "metric@example.com", password: "secret1", age: 22, height: 67, weight: 145, unitSystem: "metric",
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.user.unitSystem, "metric");
    assert.equal(registered.user.height, 67);
    assert.equal((await request("/register", "POST", {
      name: "Bad Units", email: "bad-units@example.com", password: "secret1", age: 22, height: 67, weight: 145, unitSystem: "stones",
    })).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
