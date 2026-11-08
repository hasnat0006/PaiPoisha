"use client";

// Quick-add link (spec §9): /add?type=&amount=&cat=&wallet=&note= opens the add sheet pre-filled
// over Home. Nothing is saved until the user taps Save. Used by the Android app shortcuts and iOS Shortcut.
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef } from "react";
import { loadSheet, useOpenEntry } from "@/components/shell/AppShell";
import { useEntries } from "@/features/entries/useEntries";
import { useLocale } from "@/i18n/provider";
import { parseQuickAdd } from "@/lib/quickAdd";
import HomePage from "../page";

function QuickAdd() {
  const t = useTranslations();
  const { ready } = useLocale();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const params = useSearchParams();
  const openEntry = useOpenEntry();
  const done = useRef(false);

  useEffect(() => void loadSheet(), []); // start fetching the sheet right away

  useEffect(() => {
    // Wait until the seeded wallet exists, so the sheet has a wallet to pre-select.
    if (done.current || state.status !== "ready" || state.activeWallets.length === 0) return;
    done.current = true;
    openEntry(null, parseQuickAdd(params, state.categories, state.activeWallets));
    // Back or refresh shouldn't reopen it. Only the address changes: a router navigation here would close the sheet.
    window.history.replaceState(null, "", "/");
  }, [state, params, openEntry]);

  return <HomePage />;
}

export default function AddPage() {
  return (
    <Suspense fallback={<HomePage />}>
      <QuickAdd />
    </Suspense>
  );
}
