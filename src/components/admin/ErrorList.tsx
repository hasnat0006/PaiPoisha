// Admin dashboard: crash reports from phones (migration 0008), the same error grouped, newest first.
"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ClientError } from "@/sync/admin";

export function ErrorList({ items, num }: { items: ClientError[]; num: (n: number) => string }) {
  const t = useTranslations("admin");
  const format = useFormatter();
  if (items.length === 0) return <p className="py-6 text-center text-muted-foreground">{t("noErrors")}</p>;
  return (
    <ul className="divide-y rounded-md border">
      {items.map((e) => (
        <li key={e.message} className="flex flex-col gap-1 p-3">
          <code className="break-all font-mono text-sm">{e.message}</code>
          <p className="text-xs text-muted-foreground">
            {[e.page, t("errorTimes", { count: num(e.times) }), t("errorLast", { date: format.dateTime(new Date(e.last_seen), { dateStyle: "medium", timeStyle: "short" }) })]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
