// Stay under 100 until the goal is met, without collapsing different amounts into the same whole percent.
export function boundedProgress(ratio, status) {
  if (status === "complete" || status === "over-goal") {
    return { value: 100, label: "100%", width: "100%" };
  }
  const exact = Number(ratio);
  if (!Number.isFinite(exact) || exact <= 0) {
    return { value: 0, label: "0%", width: "0%" };
  }
  const percent = exact * 100;
  if (percent < 0.1) {
    return { value: 0.1, label: "<0.1%", width: "0.4%" };
  }
  const shown = Math.min(99.9, Math.floor(percent * 10) / 10);
  const label = Number.isInteger(shown) ? `${shown}%` : `${shown.toFixed(1)}%`;
  return { value: shown, label, width: `${shown}%` };
}
