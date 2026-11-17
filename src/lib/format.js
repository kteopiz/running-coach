export function formatGrouped(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const negative = numeric < 0;
  const [whole, fraction] = Math.abs(numeric).toString().split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function formatMiles(value) {
  const numeric = Number(value);
  if (numeric > 0 && numeric < 0.1) return "<0.1";
  const rounded = Math.round(numeric * 10) / 10;
  return formatGrouped(Number.isInteger(rounded) ? rounded : Number(rounded.toFixed(1)));
}

export function formatCalories(value) {
  return formatGrouped(Math.round(Number(value)));
}
