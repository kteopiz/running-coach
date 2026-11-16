export default function HeightFields({ unitSystem, feet, inches, centimeters, onFeet, onInches, onCentimeters, error, disabled }) {
  if (unitSystem === "metric") {
    return (
      <label>
        Height (cm)
        <input name="centimeters" type="number" min="2.5" step="0.1" required disabled={disabled} value={centimeters} onChange={(event) => onCentimeters(event.target.value)} aria-invalid={Boolean(error)} />
        {error ? <span className="error">{error}</span> : null}
      </label>
    );
  }
  return (
    <div className="height-entry">
      <label>
        Feet
        <input name="feet" type="number" min="0" step="1" required disabled={disabled} value={feet} onChange={(event) => onFeet(event.target.value)} aria-invalid={Boolean(error)} />
      </label>
      <label>
        Inches
        <input name="inches" type="number" min="0" max="11.9" step="0.1" required disabled={disabled} value={inches} onChange={(event) => onInches(event.target.value)} aria-invalid={Boolean(error)} />
      </label>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
