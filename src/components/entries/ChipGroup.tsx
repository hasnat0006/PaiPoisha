// A row of single-choice chips (wallets, Today/Yesterday). Scrolls sideways if it doesn't fit.
"use client";

interface Props {
  label: string;
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  invalid?: boolean;
  children?: React.ReactNode; // extra trailing control, e.g. a date input
}

export function ChipGroup({ label, options, value, onChange, invalid, children }: Props) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={`min-h-11 shrink-0 rounded-full border px-4 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground ${invalid ? "border-destructive" : ""}`}
        >
          {o.label}
        </button>
      ))}
      {children}
    </div>
  );
}
