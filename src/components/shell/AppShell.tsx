// App frame: bottom tab bar (with the + in its middle), and the one add/edit sheet every screen opens.
// Also starts background sync and shows the welcome page on a brand-new phone.
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useState } from "react";
import { notify } from "@/components/common/notify";
import { useSyncToasts } from "@/components/sync/useSyncToasts";
import { db } from "@/db/db";
import type { Transaction } from "@/db/types";
import { useEntries } from "@/features/entries/useEntries";
import type { EntryDraft } from "@/lib/entries";
import { WELCOME_KEY, welcomeGate } from "@/lib/welcome";
import { useServiceWorker } from "@/features/pwa/usePwa";
import { useLocale } from "@/i18n/provider";
import { onMerged, setStatus, syncConfigured, useSyncStatus } from "@/sync/status";
import { TabBar } from "./TabBar";
import { useSwipeTabs } from "./useSwipeTabs";
import { Welcome } from "./Welcome";

// The sheet (and its drawer library) is the biggest piece of JS; load it after first paint.
export const loadSheet = () => import("@/components/entries/EntrySheet");
const EntrySheet = dynamic(() => loadSheet().then((m) => m.EntrySheet), { ssr: false });

type OpenEntry = (tx: Transaction | null, prefill?: Partial<EntryDraft>) => void;
const Ctx = createContext<OpenEntry>(() => {});
/** Open the add sheet (null, optionally pre-filled) or edit an entry. */
export const useOpenEntry = () => useContext(Ctx);

function readSkipped(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === "skipped";
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const { ready, setLocale, setBanglaDigits } = useLocale();
  const sync = useSyncStatus();
  const pathname = usePathname();
  const entryCount = useLiveQuery(() => db.transactions.count(), []);
  const [skipped, setSkipped] = useState<boolean | null>(null);
  const gate = welcomeGate({
    configured: syncConfigured(),
    onCallback: pathname.startsWith("/auth/") || pathname.startsWith("/privacy"), // the policy must open for anyone (Google checks it)
    skipped,
    entries: entryCount,
    known: sync.known,
    signedIn: sync.state !== "signed_out",
  });
  // No defaults are seeded behind the welcome page: the language may still change, or the account's data may arrive.
  const state = useEntries(ready && gate === "hide" ? t("entries.cashWallet") : null);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [prefill, setPrefill] = useState<Partial<EntryDraft>>();
  useServiceWorker();
  const swipe = useSwipeTabs();
  useSyncToasts();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setSkipped(readSkipped()); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only storage, read after hydration
  }, []);

  useEffect(() => {
    // supabase-js is loaded only here, after first paint, so it never counts toward the first-load bundle.
    if (!syncConfigured()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("@/sync/runner").then(
      (m) => !cancelled && (stop = m.startSync()),
      () => setStatus({ known: true }), // chunk failed to load (offline, not cached): carry on local-only
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  useEffect(
    () =>
      onMerged((r) => {
        // First sign-in on this phone: the account's language, digits and theme win (user's choice 2026-11-08).
        if (r.settings) {
          setLocale(r.settings.language);
          setBanglaDigits(r.settings.bangla_digits);
          setTheme(r.settings.theme);
        }
        if (r.hadCloud && r.added > 0) notify.success(t("sync.merged", { count: r.added }), { duration: 4000 }); // a summary: give it time
      }),
    [t, setLocale, setBanglaDigits, setTheme],
  );

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

  const skip = () => {
    try {
      localStorage.setItem(WELCOME_KEY, "skipped");
    } catch {
      /* private mode: shown again next time */
    }
    setSkipped(true);
  };

  const openEntry: OpenEntry = (tx, fill) => {
    setEditing(tx);
    setPrefill(fill);
    setUsed(true);
    setOpen(true);
  };

  if (gate === "wait") return null; // a moment on a brand-new phone, so Home doesn't flash before the welcome page
  if (gate === "show") return <Welcome onSkip={skip} />;

  return (
    <Ctx.Provider value={openEntry}>
      <div className="flex flex-1 flex-col pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] [touch-action:pan-y_pinch-zoom]" {...swipe}>
        {children}
      </div>
      <TabBar onAdd={state.status === "ready" ? () => openEntry(null) : undefined} />
      {used && state.status === "ready" && <EntrySheet open={open} onOpenChange={setOpen} editing={editing} data={state} prefill={prefill} />}
    </Ctx.Provider>
  );
}
