// Edit-only wallet actions: Adjust balance, archive / unarchive, delete (spec §2).
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Wallet } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import { adjustBalance, canArchive, canDelete, deleteWallet, setArchived } from "@/features/wallets/walletActions";
import { useMoney } from "@/i18n/provider";
import { parseSignedAmount, type Paisa } from "@/lib/money";

interface Props {
  wallet: Wallet;
  balance: Paisa;
  data: EntriesData;
  done: () => void;
}

export function WalletManage({ wallet, balance, data, done }: Props) {
  const t = useTranslations("wallets");
  const { formatMoney } = useMoney();
  const [real, setReal] = useState("");
  const [badAmount, setBadAmount] = useState(false);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message, { duration: 1500 });
      done();
    } catch {
      toast.error(t("saveError"));
    }
  };

  const adjust = async () => {
    const value = parseSignedAmount(real);
    if (value === null) return setBadAmount(true);
    try {
      if (await adjustBalance(wallet, balance, value, data)) {
        toast.success(t("adjusted"), { duration: 1500 });
        done();
      } else setBadAmount(true);
    } catch {
      toast.error(t("saveError"));
    }
  };

  const deletable = canDelete(wallet, data);
  const archivable = canArchive(wallet, data);

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      {!wallet.archived && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t("adjustHint", { amount: formatMoney(balance) })}
          </p>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={real}
              onChange={(e) => {
                setReal(e.target.value);
                setBadAmount(false);
              }}
              placeholder={t("realBalance")}
              aria-label={t("realBalance")}
              aria-invalid={badAmount}
              className="tabular-nums"
            />
            <Button variant="outline" className="min-h-11 shrink-0 px-4" onClick={adjust}>
              {t("adjust")}
            </Button>
          </div>
          {badAmount && <p role="alert" className="text-sm text-destructive">{t("errAdjust")}</p>}
        </div>
      )}

      <div className="flex gap-2">
        {wallet.archived ? (
          <Button variant="outline" className="min-h-11 flex-1" onClick={() => run(() => setArchived(wallet, false, data), t("unarchived"))}>
            {t("unarchive")}
          </Button>
        ) : (
          <Button variant="outline" className="min-h-11 flex-1" disabled={!archivable} onClick={() => run(() => setArchived(wallet, true, data), t("archived"))}>
            {t("archive")}
          </Button>
        )}
        <Button variant="destructive" className="min-h-11 flex-1" disabled={!deletable} onClick={() => run(() => deleteWallet(wallet, data), t("deleted"))}>
          {t("delete")}
        </Button>
      </div>
      {!archivable && !wallet.archived && <p className="text-sm text-muted-foreground">{t("lastWallet")}</p>}
      {archivable && !deletable && <p className="text-sm text-muted-foreground">{t("hasEntries")}</p>}
    </div>
  );
}
