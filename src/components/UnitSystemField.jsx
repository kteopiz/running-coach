export default function UnitSystemField({ value, onChange, disabled }) {
  return (
    <label>
      Units
      <select name="unitSystem" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="imperial">Imperial (ft/in and miles)</option>
        <option value="metric">Metric (cm and km)</option>
      </select>
      <span className="account-help">Saved on your account. Height uses feet and inches, or centimeters.</span>
    </label>
  );
}
