function roundTenth(value) {
  return Math.round(Number(value) * 10) / 10;
}

export function weeklyProgress(completedMiles, goalMiles) {
  const completed = Number.isFinite(Number(completedMiles)) ? roundTenth(Math.max(0, Number(completedMiles))) : 0;
  const goal = Number(goalMiles);
  const hasGoal = Number.isFinite(goal) && goal > 0;

  if (!hasGoal) {
    return {
      completedMiles: completed,
      remainingMiles: null,
      overMiles: 0,
      progress: null,
      status: "no-goal",
    };
  }

  const roundedGoal = roundTenth(goal);
  const remainingMiles = roundTenth(Math.max(0, roundedGoal - completed));
  const overMiles = completed > roundedGoal ? roundTenth(completed - roundedGoal) : 0;
  let status = "in-progress";
  if (overMiles > 0) status = "over-goal";
  else if (remainingMiles === 0) status = "complete";

  return {
    completedMiles: completed,
    remainingMiles,
    overMiles,
    progress: Math.min(1, completed / roundedGoal),
    status,
  };
}
