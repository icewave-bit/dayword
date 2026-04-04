type SegmentTabsProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  ariaLabel: string
}

export function SegmentTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentTabsProps<T>) {
  return (
    <div className="user-auth-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`user-auth-tab ${value === o.value ? 'active' : ''}`.trim()}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
