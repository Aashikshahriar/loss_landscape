import { useEffect, useState } from 'react';
interface Props {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}
export function NumberField({
  label,
  value,
  onChange,
  step = 'any',
  min,
  max,
  hint,
}: Omit<Props, 'step'> & { step?: number | 'any' }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="field">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (
            draft.trim() !== '' &&
            Number.isFinite(n) &&
            (min === undefined || n >= min) &&
            (max === undefined || n <= max)
          ) {
            onChange(n);
          } else {
            setDraft(String(value));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
