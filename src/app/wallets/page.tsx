"use client";

// Wallets screen (spec §2): balances, total, reorder, add / edit / adjust / archive.
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoveButtons } from "@/components/common/MoveButtons";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadError, LoadingRows } from "@/components/common/ScreenState";
import { CategoryIcon } from "@/components/entries/CategoryIcon";
import { Button } from "@/components/ui/button";
import type { Wallet } from "@/db/types";
import { useEntries } from "@/features/entries/useEntries";
import { moveWallet } from "@/features/wallets/walletActions";
import { useLocale, useMoney } from "@/i18n/provider";
import { totalBalance, walletBalances } from "@/lib/balances";

// The sheet brings the drawer library; load it only when first opened.
const WalletSheet = dynamic(() => import("@/components/wallets/WalletSheet").then((m) => m.WalletSheet), { ssr: false });

export default function WalletsPage() {
  const t = useTranslations();
  const { ready } = useLocale();
  const { formatMoney } = useMoney();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const edit = (w: Wallet | null) => {
    setEditing(w);
    setUsed(true);
    setOpen(true);
  };

  if (state.status !== "ready") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <PageHeader title={t("wallets.title")} />
        {state.status === "loading" ? <LoadingRows /> : <LoadError onRetry={state.retry} />}
      </main>
    );
  }

  const balances = walletBalances(state.wallets, state.entries);
  const archived = state.wallets.filter((w) => w.archived);
  const money = (p: number) => (
    <span className={`whitespace-nowrap tabular-nums ${p < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{formatMoney(p)}</span>
  );
  const row = (w: Wallet) => (
    <button type="button" onClick={() => edit(w)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
      <CategoryIcon name={w.icon} color={w.color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base">{w.name}</span>
        <span className="block text-sm text-muted-foreground">
          {w.provider ? t(`wallets.providers.${w.provider}`) : t(`wallets.kinds.${w.kind}`)}
        </span>
      </span>
      <span className="text-base font-medium">{money(balances.get(w.id) ?? 0)}</span>
    </button>
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <PageHeader title={t("wallets.title")} />
      <section className="rounded-xl border p-4">
        <div className="text-sm text-muted-foreground">{t("home.totalBalance")}</div>
        <div className="text-2xl font-semibold">{money(totalBalance(state.activeWallets, balances))}</div>
      </section>

      <ul className="divide-y rounded-xl border">
        {state.activeWallets.map((w, i) => (
          <li key={w.id} className="flex items-center gap-1 pl-3">
            {row(w)}
            <MoveButtons index={i} count={state.activeWallets.length} onMove={(dir) => moveWallet(state.activeWallets, i, dir)} />
          </li>
        ))}
      </ul>

      <Button className="min-h-11 text-base" onClick={() => edit(null)}>
        {t("wallets.add")}
      </Button>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">{t("wallets.archivedTitle")}</h2>
          <ul className="divide-y rounded-xl border opacity-70">
            {archived.map((w) => (
              <li key={w.id} className="flex px-3">{row(w)}</li>
            ))}
          </ul>
        </section>
      )}

      {used && <WalletSheet open={open} onOpenChange={setOpen} wallet={editing} balance={editing ? (balances.get(editing.id) ?? 0) : 0} data={state} />}
    </main>
  );
}
