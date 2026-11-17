import AppShell from "../components/AppShell";

export default function HowItWorks({ user, onNavigate }) {
  return (
    <AppShell user={user} page="guide" onNavigate={onNavigate}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WHERE THE NUMBERS COME FROM</p>
          <h1>How the numbers work</h1>
          <p className="muted">Every total on Overview comes from a run, meal, or goal you saved, or from a rule applied to those saved values.</p>
        </div>
      </div>
      <div className="guide-sections">
        <section className="panel" aria-labelledby="guide-week">
          <h2 id="guide-week">The week</h2>
          <p>The week starts on Sunday and ends on Saturday. Completed distance uses the runs you saved from Sunday through today. A run dated before Sunday stays in history and is left out of this week.</p>
        </section>
        <section className="panel" aria-labelledby="guide-distance">
          <h2 id="guide-distance">Distance</h2>
          <p>Runs and the weekly goal are stored in miles. When your account uses kilometers, each figure is those miles multiplied by 1.609344 and rounded to two decimals.</p>
          <p>Still to log starts from your saved weekly goal and takes away the miles in the runs listed for this week. That gap is converted once, then written out in words. The three figures are Logged, Weekly goal, and Still to log.</p>
        </section>
        <section className="panel" aria-labelledby="guide-today">
          <h2 id="guide-today">Today’s suggested distance</h2>
          <ul>
            <li>Start with the miles still left in the weekly goal.</li>
            <li>Divide that by the days left in the week, counting today. Sunday has 7 days left. Saturday has 1.</li>
            <li>A day does not go above 25 percent of the weekly goal, and it does not go above 6 miles.</li>
            <li>A run already saved for today cuts that suggestion in half.</li>
            <li>Runs saved on 3 different days this week, or a goal that is already met, suggest rest.</li>
          </ul>
        </section>
        <section className="panel" aria-labelledby="guide-estimate">
          <h2 id="guide-estimate">The calorie estimate</h2>
          <p>This is an educational number. It is not a target and it is not medical advice. Logging a run or a meal does not change it.</p>
          <p>Resting calories use age, height, and weight with the midpoint of the Mifflin-St Jeor equation. Running calories are the weekly mileage goal, times weight in pounds, times 0.63, divided by 7. Height and weight stay in the stored inches and pounds.</p>
        </section>
        <section className="panel" aria-labelledby="guide-meals">
          <h2 id="guide-meals">Meals and calorie goals</h2>
          <p>A meal’s calories are the number you typed. The week list adds those saved meals. A day with no saved meal is left out, so a daily goal is not copied onto that empty day.</p>
          <p>On a day that has a meal, the goal beside it is the latest calorie goal you saved on or before that day. A saved goal with no calories means that day has no calorie goal. If you have not saved one, it uses the daily calorie goal on your profile. If neither is saved, the day shows the meals only.</p>
          <p>The meal log’s remaining calories use the calorie goal for the date you have selected. That is the latest goal saved on or before that day, or the daily calorie goal on your profile when no dated goal is saved. A cleared goal leaves no remaining figure. The count stops at zero when the meals go past the goal.</p>
        </section>
      </div>
    </AppShell>
  );
}
