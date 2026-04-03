type Option<T extends string | number> = { value: T; label: string }

type ChoiceChipsProps<T extends string | number> = {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <div className="choice-group">
      <div className="choice-label">{label}</div>
      <div className="choice-chips" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`chip ${value === opt.value ? 'chip-active' : ''}`.trim()}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
