// The sliding switch drawn inside a role="switch" row (the row is the tap target, so this is only the picture).
export function SwitchKnob({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${on ? "left-[22px]" : "left-0.5"}`} />
    </span>
  );
}
