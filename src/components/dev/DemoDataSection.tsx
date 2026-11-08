// More tab → Developer (only in `npm run dev`): add or remove the demo data set. Disabled while signed in,
// because the rows would upload to the real account.
"use client";

import { Database, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/db/db";
import { addDemoData, removeDemoData } from "@/features/demo/demoData";
import { useSyncStatus } from "@/sync/status";

export function DemoDataSection({ row }: { row: string }) {
  const t = useTranslations("demo");
  const { state } = useSyncStatus();
  const hasDemo = useLiveQuery(async () => !!(await db.meta.get("demo_rows")), []);
  const [busy, setBusy] = useState(false);
  const signedIn = state !== "signed_out";

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await fn());
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={t("title")} className="rounded-xl border border-dashed">
      <h2 className="px-4 pt-3 text-sm font-medium text-muted-foreground">{t("title")}</h2>
      {signedIn && !hasDemo && <p className="px-4 pt-1 text-sm text-muted-foreground">{t("signOutFirst")}</p>}
      <ul className="divide-y">
        <li>
          <button type="button" className={`${row} disabled:opacity-50`} disabled={busy || hasDemo !== false || signedIn} onClick={() => run(async () => t("added", { count: await addDemoData() }))}>
            <Database className="size-5" aria-hidden />
            <span className="flex-1">{t("add")}</span>
          </button>
        </li>
        <li>
          <button type="button" className={`${row} disabled:opacity-50`} disabled={busy || !hasDemo} onClick={() => run(async () => (await removeDemoData(), t("removed")))}>
            <Trash2 className="size-5" aria-hidden />
            <span className="flex-1">{t("remove")}</span>
          </button>
        </li>
      </ul>
    </section>
  );
}
