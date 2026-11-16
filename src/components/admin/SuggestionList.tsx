// Admin dashboard: feature suggestions with a status filter; the admin moves each one to planned, done or declined.
"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Suggestion, SuggestionStatus } from "@/sync/admin";

const STATUSES: SuggestionStatus[] = ["new", "planned", "done", "declined"];

export function SuggestionList(props: { items: Suggestion[]; onStatus: (id: string, s: SuggestionStatus) => void; num: (n: number) => string }) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const [filter, setFilter] = useState<SuggestionStatus | "all">("all");
  const shown = filter === "all" ? props.items : props.items.filter((s) => s.status === filter);
  const count = (f: SuggestionStatus | "all") => (f === "all" ? props.items.length : props.items.filter((s) => s.status === f).length);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("filter")}>
        {(["all", ...STATUSES] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-md border px-3 text-sm ${filter === f ? "border-foreground bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {t(`status.${f}`)} <span className="tabular-nums">{props.num(count(f))}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t("noSuggestions")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 font-medium break-words">{s.title}</h3>
                <Select value={s.status} onValueChange={(v) => v && v !== s.status && props.onStatus(s.id, v as SuggestionStatus)}>
                  <SelectTrigger aria-label={t("statusOf", { title: s.title })} className="min-h-11 w-32 shrink-0">
                    {t(`status.${s.status}`)}
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st} className="min-h-11">{t(`status.${st}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {s.body && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{s.body}</p>}
              <p className="text-xs text-muted-foreground">{format.dateTime(new Date(s.created_at), { dateStyle: "medium" })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
