import { formatGrouped, formatMiles } from "./format.js";
import { INPUT_LIMITS } from "./validation.js";

export const CM_PER_INCH = 2.54;
export const KM_PER_MILE = 1.609344;
export const INCHES_PER_FOOT = 12;

function roundPlaces(value, places) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function trimNumber(value, places) {
  return value.toFixed(places).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function normalizeUnitSystem(value) {
  return value === "metric" ? "metric" : "imperial";
}

export function parseUnitSystem(value) {
  if (value === "imperial" || value === "metric") return { unitSystem: value };
  return { error: "Choose imperial or metric units." };
}

export function inchesToCentimeters(inches) {
  return roundPlaces(Number(inches) * CM_PER_INCH, 1);
}

export function centimetersToInches(centimeters) {
  return roundPlaces(Number(centimeters) / CM_PER_INCH, 1);
}

export function milesToKilometers(miles) {
  return roundPlaces(Number(miles) * KM_PER_MILE, 2);
}

export function kilometersToMiles(kilometers) {
  return roundPlaces(Number(kilometers) / KM_PER_MILE, 2);
}

export function heightFieldsFromInches(inches, unitSystem) {
  const total = roundPlaces(inches, 1);
  if (normalizeUnitSystem(unitSystem) === "metric") {
    return { centimeters: String(inchesToCentimeters(total)), feet: "", inches: "" };
  }
  let feet = Math.floor(total / INCHES_PER_FOOT);
  let inchPart = roundPlaces(total - feet * INCHES_PER_FOOT, 1);
  if (inchPart >= INCHES_PER_FOOT) {
    feet += 1;
    inchPart = 0;
  }
  return { feet: String(feet), inches: String(inchPart), centimeters: "" };
}

export function inchesFromHeightEntry({ unitSystem, centimeters, feet, inches }) {
  if (normalizeUnitSystem(unitSystem) === "metric") {
    if (centimeters == null || String(centimeters).trim() === "") return { error: "Enter a height in centimeters." };
    const cm = Number(centimeters);
    if (!Number.isFinite(cm) || cm <= 0) return { error: "Enter a height in centimeters." };
    const total = centimetersToInches(cm);
    if (total < 1) return { error: "Height must be at least 2.5 cm." };
    return { inches: total };
  }
  if (feet == null || String(feet).trim() === "" || inches == null || String(inches).trim() === "") {
    return { error: "Enter height in feet and inches." };
  }
  const feetNum = Number(feet);
  const inchNum = Number(inches);
  if (!Number.isInteger(feetNum) || feetNum < 0) return { error: "Feet must be a whole number of at least 0." };
  if (!Number.isFinite(inchNum) || inchNum < 0 || inchNum >= INCHES_PER_FOOT) {
    return { error: "Inches must be at least 0 and less than 12." };
  }
  const total = roundPlaces(feetNum * INCHES_PER_FOOT + inchNum, 1);
  if (total < 1) return { error: "Height must be at least 1 inch." };
  return { inches: total };
}

export function heightEntryIsBlank({ unitSystem, centimeters, feet, inches }) {
  if (normalizeUnitSystem(unitSystem) === "metric") return centimeters == null || String(centimeters).trim() === "";
  return (feet == null || String(feet).trim() === "") && (inches == null || String(inches).trim() === "");
}

export function convertHeightEntry(entry, nextUnit) {
  if (heightEntryIsBlank(entry)) return { centimeters: "", feet: "", inches: "" };
  const parsed = inchesFromHeightEntry(entry);
  if (parsed.error) return parsed;
  return { ...heightFieldsFromInches(parsed.inches, nextUnit), inchesTotal: parsed.inches };
}

export function formatHeight(inches, unitSystem) {
  const fields = heightFieldsFromInches(inches, unitSystem);
  if (normalizeUnitSystem(unitSystem) === "metric") return `${fields.centimeters} cm`;
  return `${fields.feet} ft ${fields.inches} in`;
}

export function distanceInputValue(miles, unitSystem) {
  if (miles == null || miles === "") return "";
  const shown = normalizeUnitSystem(unitSystem) === "metric" ? milesToKilometers(miles) : roundPlaces(miles, 2);
  return trimNumber(shown, normalizeUnitSystem(unitSystem) === "metric" ? 2 : 2);
}

export function milesFromDistanceEntry(value, unitSystem) {
  const metric = normalizeUnitSystem(unitSystem) === "metric";
  if (value == null || String(value).trim() === "") {
    return { error: metric ? "Enter a distance in kilometers." : "Enter a distance in miles." };
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return { error: "Distance must be a positive number." };
  if (!metric) return { miles: number };
  const miles = kilometersToMiles(number);
  if (!(miles > 0)) return { error: "Distance must be a positive number." };
  return { miles };
}

export function convertDistanceEntry(value, fromUnit, toUnit) {
  if (value == null || String(value).trim() === "") return { value: "" };
  const parsed = milesFromDistanceEntry(value, fromUnit);
  if (parsed.error) return parsed;
  return { value: distanceInputValue(parsed.miles, toUnit), miles: parsed.miles };
}

export function formatDistanceAmount(miles, unitSystem) {
  const value = Number(miles);
  if (normalizeUnitSystem(unitSystem) === "metric") {
    const km = milesToKilometers(value);
    if (value > 0 && km < 0.01) return "<0.01";
    return formatGrouped(km);
  }
  return formatMiles(value);
}

export function distanceUnitShort(unitSystem) {
  return normalizeUnitSystem(unitSystem) === "metric" ? "km" : "mi";
}

export function distanceUnitName(unitSystem) {
  return normalizeUnitSystem(unitSystem) === "metric" ? "km" : "miles";
}

export function distanceHeading(unitSystem) {
  return normalizeUnitSystem(unitSystem) === "metric" ? "Kilometers" : "Miles";
}

export function distanceFieldLabel(unitSystem) {
  return normalizeUnitSystem(unitSystem) === "metric" ? "Distance (km)" : "Distance (miles)";
}

export function weeklyGoalLabel(unitSystem) {
  return normalizeUnitSystem(unitSystem) === "metric" ? "Weekly mileage goal (km)" : "Weekly mileage goal (miles)";
}

export function displayedDistanceBounds(unitSystem) {
  const metric = normalizeUnitSystem(unitSystem) === "metric";
  return {
    min: metric ? milesToKilometers(INPUT_LIMITS.minRunMiles) : INPUT_LIMITS.minRunMiles,
    max: metric ? milesToKilometers(INPUT_LIMITS.maxRunMiles) : INPUT_LIMITS.maxRunMiles,
    unit: metric ? "km" : "miles",
  };
}

export function distanceRangeMessage(unitSystem, subject = "Distance") {
  const bounds = displayedDistanceBounds(unitSystem);
  return `${subject} must be from ${bounds.min} to ${bounds.max} ${bounds.unit}.`;
}

export function heightRangeMessage(unitSystem) {
  if (normalizeUnitSystem(unitSystem) === "metric") {
    return `Height must be from ${inchesToCentimeters(INPUT_LIMITS.minHeightInches)} to ${inchesToCentimeters(INPUT_LIMITS.maxHeightInches)} cm.`;
  }
  return `Height must be from ${INPUT_LIMITS.minHeightInches} to ${INPUT_LIMITS.maxHeightInches} inches.`;
}

export function recommendationText(recommendation, unitSystem) {
  if (!recommendation?.message || normalizeUnitSystem(unitSystem) !== "metric") return recommendation?.message || "";
  return recommendation.message
    .replace(/(\d+(?:\.\d+)?)[ -]miles?\b/g, (_, amount) =>
      `${formatDistanceAmount(Number(amount), "metric")} km`)
    .replace(/\bmiles?\b/g, "km");
}
