function byDateTime(a, b) {
  return a.date.localeCompare(b.date)
    || String(a.startTime || "").localeCompare(String(b.startTime || ""))
    || a.id - b.id;
}

export function sortRuns(runs, sort = "newest") {
  const list = [...runs];
  if (sort === "oldest") return list.sort(byDateTime);
  if (sort === "distance-desc") return list.sort((a, b) => b.distanceMiles - a.distanceMiles || byDateTime(b, a));
  if (sort === "distance-asc") return list.sort((a, b) => a.distanceMiles - b.distanceMiles || byDateTime(a, b));
  if (sort === "duration-desc") return list.sort((a, b) => (b.durationMinutes ?? -1) - (a.durationMinutes ?? -1) || byDateTime(b, a));
  if (sort === "duration-asc") return list.sort((a, b) => (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity) || byDateTime(a, b));
  return list.sort((a, b) => byDateTime(b, a));
}
