import { useCallback } from 'react';

/**
 * 双滑块区间（TMDB 风格：青蓝轨道 + 圆柄）
 * @param {number} min
 * @param {number} max
 * @param {number} step
 * @param {number} valueMin
 * @param {number} valueMax
 * @param {(a: { min: number, max: number }) => void} onChange
 * @param {number[]} ticks 刻度标签位置
 */
export default function FilterRangeDual({
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  ticks,
  label,
  formatTick = (v) => String(v),
  /** 例如 filter-range-dual--duration 用于刻度尺皮肤 */
  className = '',
}) {
  const clamp = useCallback(
    (v) => Math.min(max, Math.max(min, v)),
    [min, max]
  );

  const setMin = (v) => {
    const n = clamp(Number(v));
    onChange({ min: Math.min(n, valueMax), max: valueMax });
  };

  const setMax = (v) => {
    const n = clamp(Number(v));
    onChange({ min: valueMin, max: Math.max(n, valueMin) });
  };

  const loPct = ((valueMin - min) / (max - min || 1)) * 100;
  const hiPct = ((valueMax - min) / (max - min || 1)) * 100;

  return (
    <div className={`filter-range-dual ${className}`.trim()}>
      {label && <div className="filter-range-dual__label">{label}</div>}
      <div className="filter-range-dual__ticks">
        {(ticks || [min, max]).map((t) => (
          <span key={t} className="filter-range-dual__tick">
            {formatTick(t)}
          </span>
        ))}
      </div>
      <div className="filter-range-dual__track-wrap">
        <div
          className="filter-range-dual__track-fill"
          style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
        />
        <input
          type="range"
          className="filter-range-dual__input filter-range-dual__input--lower"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => setMin(e.target.value)}
          aria-label={`${label} 最小值`}
        />
        <input
          type="range"
          className="filter-range-dual__input filter-range-dual__input--upper"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => setMax(e.target.value)}
          aria-label={`${label} 最大值`}
        />
      </div>
    </div>
  );
}
