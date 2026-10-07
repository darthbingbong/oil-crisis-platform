interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

/**
 * Wraps a native <input type="range"> with a 44px-tall padded hit area
 * (touch target min) while keeping the visible track a thin hairline, and
 * an explicit aria-label since the on-screen label isn't a <label for=...>
 * (it doubles as the live value readout).
 */
export default function Slider({ label, value, min, max, step, unit, onChange }: Props) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="section-label">{label}</span>
        <span className="data-readout text-base" style={{ color: "var(--color-crude)" }}>
          {value}
          {unit}
        </span>
      </div>
      <div className="flex items-center h-11">
        <input
          type="range"
          className="terminal-slider w-full"
          aria-label={label}
          aria-valuetext={`${value}${unit}`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
