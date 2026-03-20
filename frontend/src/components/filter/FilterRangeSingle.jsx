/**
 * 单滑块（如最少投票人数）
 */
export default function FilterRangeSingle({
  min,
  max,
  step = 1,
  value,
  onChange,
  ticks,
  label,
  formatTick = (v) => String(v),
}) {
  const pct = ((value - min) / (max - min || 1)) * 100;

  return (
    <div className="filter-range-single">
      {label && <div className="filter-range-single__label">{label}</div>}
      <div className="filter-range-single__ticks">
        {(ticks || [min, max]).map((t) => (
          <span key={t} className="filter-range-single__tick">
            {formatTick(t)}
          </span>
        ))}
      </div>
      <div className="filter-range-single__track-wrap">
        <div className="filter-range-single__track-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          className="filter-range-single__input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
}
