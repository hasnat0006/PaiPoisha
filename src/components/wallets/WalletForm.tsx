// Add/edit wallet fields (spec §2): preset, name, type, provider, opening balance, colour, icon.
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { LookPicker } from "@/components/common/LookPicker";
import { notify } from "@/components/common/notify";
import { ChipGroup } from "@/components/entries/ChipGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MfsProvider, Wallet, WalletKind } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import { PRESETS, type PresetKey } from "@/features/wallets/presets";
import { saveWallet, WALLET_NAME_MAX, type WalletFields } from "@/features/wallets/walletActions";
import { paisaToInput } from "@/lib/entries";
import { MAX_AMOUNT_PAISA, parseSignedAmount } from "@/lib/money";

const KINDS: WalletKind[] = ["cash", "mfs", "bank", "card"];
const PROVIDERS: MfsProvider[] = ["bkash", "nagad", "rocket", "upay", "other"];

type Draft = Omit<WalletFields, "opening_balance_paisa"> & { opening: string };

const fromWallet = (w: Wallet | null): Draft =>
  w
    ? { name: w.name, kind: w.kind, provider: w.provider, color: w.color, icon: w.icon, opening: paisaToInput(w.opening_balance_paisa) }
    : { name: "", ...PRESETS.cash, opening: "" };

export function WalletForm({ wallet, data, done }: { wallet: Wallet | null; data: EntriesData; done: () => void }) {
  const t = useTranslations("wallets");
  const tc = useTranslations("common");
  const [d, setD] = useState(() => fromWallet(wallet));
  const [error, setError] = useState<"name" | "opening" | null>(null);
  const set = (c: Partial<Draft>) => {
    setD((x) => ({ ...x, ...c }));
    setError(null);
  };

  const save = async () => {
    const opening = d.opening.trim() === "" ? 0 : parseSignedAmount(d.opening);
    const invalid = (e: "name" | "opening") => (setError(e), notify.invalid(e === "name" ? t("errName") : t("errAmount")));
    if (!d.name.trim()) return invalid("name");
    if (opening === null || Math.abs(opening) > MAX_AMOUNT_PAISA) return invalid("opening");
    try {
      await saveWallet({ ...d, opening_balance_paisa: opening }, data, wallet?.id);
      notify.success(wallet ? t("updated") : t("added"));
      done();
    } catch {
      notify.error(tc("saveError"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!wallet && (
        <ChipGroup
          label={t("preset")}
          options={(Object.keys(PRESETS) as PresetKey[]).map((k) => ({ id: k, label: t(`presets.${k}`) }))}
          value={null}
          onChange={(k) => set({ ...PRESETS[k as PresetKey], name: t(`presets.${k as PresetKey}`) })}
        />
      )}
      <Input
        value={d.name}
        maxLength={WALLET_NAME_MAX}
        onChange={(e) => set({ name: e.target.value })}
        placeholder={t("name")}
        aria-label={t("name")}
        aria-invalid={error === "name"}
      />
      <ChipGroup
        label={t("kind")}
        options={KINDS.map((k) => ({ id: k, label: t(`kinds.${k}`) }))}
        value={d.kind}
        onChange={(k) => set({ kind: k as WalletKind, provider: k === "mfs" ? (d.provider ?? "bkash") : null })}
      />
      {d.kind === "mfs" && (
        <ChipGroup
          label={t("provider")}
          options={PROVIDERS.map((p) => ({ id: p, label: t(`providers.${p}`) }))}
          value={d.provider}
          onChange={(p) => set({ provider: p as MfsProvider })}
        />
      )}
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        {t("opening")}
        <Input
          inputMode="decimal"
          value={d.opening}
          onChange={(e) => set({ opening: e.target.value })}
          placeholder="0"
          aria-invalid={error === "opening"}
          className="tabular-nums"
        />
      </label>
      <LookPicker color={d.color} icon={d.icon} onChange={(c) => set(c)} />
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error === "name" ? t("errName") : t("errAmount")}
        </p>
      )}
      <Button className="min-h-11 text-base" onClick={save}>
        {tc("save")}
      </Button>
    </div>
  );
}
