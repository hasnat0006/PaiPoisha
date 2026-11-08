// A labelled row with one themed dropdown (user, 2026-11-08): "Category [Select category]", "Wallet [bKash]".
// Not a native <select>: its list ignores dark mode and can't show icons.
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

/** The label column of the add sheet's rows; the same width everywhere so the controls line up. */
export const FIELD_LABEL = "w-20 shrink-0 text-sm text-muted-foreground";

interface Props {
  label: string;
  placeholder: string;
  options: { id: string; label: string; icon?: React.ReactNode }[];
  value: string | null;
  onChange: (id: string) => void;
  invalid?: boolean;
}

export function FieldSelect({ label, placeholder, options, value, onChange, invalid }: Props) {
  const selected = options.find((o) => o.id === value);
  return (
    <div className="flex items-center gap-2">
      <span className={FIELD_LABEL} aria-hidden>{label}</span>
      <Select value={value ?? null} onValueChange={(id) => id && onChange(id as string)}>
        <SelectTrigger aria-label={label} aria-invalid={invalid} className="min-h-11 min-w-0 flex-1 gap-2 px-3 text-base">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selected ? (
              <>
                {selected.icon}
                <span className="truncate">{selected.label}</span>
              </>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </span>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="max-h-[min(var(--available-height),24rem)]">
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id} className="min-h-11 text-base">
              <span className="flex items-center gap-3">
                {o.icon}
                {o.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
