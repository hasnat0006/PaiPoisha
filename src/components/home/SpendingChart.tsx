// Donut of the top 5 spending categories plus "Others" (spec §6). Loaded lazily: Recharts is large.
"use client";

import { Pie, PieChart } from "recharts";

export interface Slice {
  id: string | null; // null = Others
  name: string;
  spent: number;
  fill: string;
}

export default function SpendingChart({ slices, onSelect }: { slices: Slice[]; onSelect: (s: Slice) => void }) {
  return (
    <PieChart width={160} height={160} aria-hidden>
      <Pie
        data={slices}
        dataKey="spent"
        nameKey="name"
        innerRadius={48}
        outerRadius={76}
        paddingAngle={1}
        stroke="none"
        isAnimationActive={false}
        onClick={(_, i) => onSelect(slices[i])}
      />
    </PieChart>
  );
}
