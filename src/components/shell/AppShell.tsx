// App frame: bottom tab bar, the always-visible + button, and the one add/edit sheet every screen opens.
"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/db/types";
import { useEntries } from "@/features/entries/useEntries";
import type { EntryDraft } from "@/lib/entries";
import { useServiceWorker } from "@/features/pwa/usePwa";
import { useLocale } from "@/i18n/provider";
import { TabBar } from "./TabBar";

// The sheet (and its drawer library) is the biggest piece of JS; load it after first paint.
export const loadSheet = () => import("@/components/entries/EntrySheet");
const EntrySheet = dynamic(() => loadSheet().then((m) => m.EntrySheet), { ssr: false });

type OpenEntry = (tx: Transaction | null, prefill?: Partial<EntryDraft>) => void;
const Ctx = createContext<OpenEntry>(() => {});
/** Open the add sheet (null, optionally pre-filled) or edit an entry. */
export const useOpenEntry = () => useContext(Ctx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const { ready } = useLocale();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [prefill, setPrefill] = useState<Partial<EntryDraft>>();
  useServiceWorker();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // The viewport theme-color metas follow the phone; a manual Light/Dark choice must recolour the status bar too.
    if (!resolvedTheme) return;
    const color = resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
  }, [resolvedTheme]);

  useEffect(() => {
    const id = setTimeout(() => void loadSheet(), 1000); // preload so + opens instantly
    return () => clearTimeout(id);
  }, []);

  const openEntry: OpenEntry = (tx, fill) => {
    setEditing(tx);
    setPrefill(fill);
    setUsed(true);
    setOpen(true);
  };

  return (
    <Ctx.Provider value={openEntry}>
      <div className="flex flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</div>
      {state.status === "ready" && (
        <Button
          className="fixed right-[max(1rem,calc(50%-14rem+1rem))] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg glass! [--glass-tint:var(--primary)]"
          onClick={() => openEntry(null)}
          aria-label={t("entries.add")}
        >
          <Plus className="size-7" />
        </Button>
      )}
      <TabBar />
      {used && state.status === "ready" && <EntrySheet open={open} onOpenChange={setOpen} editing={editing} data={state} prefill={prefill} />}
    </Ctx.Provider>
  );
}
