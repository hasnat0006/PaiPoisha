// Bottom sheet to add a wallet, or edit / adjust / archive / delete one.
"use client";

import { useTranslations } from "next-intl";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Wallet } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import type { Paisa } from "@/lib/money";
import { WalletForm } from "./WalletForm";
import { WalletManage } from "./WalletManage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: Wallet | null;
  balance: Paisa;
  data: EntriesData;
}

export function WalletSheet({ open, onOpenChange, wallet, balance, data }: Props) {
  const t = useTranslations("wallets");
  const close = () => onOpenChange(false);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">{wallet ? t("editTitle") : t("addTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <WalletForm key={wallet?.id ?? "new"} wallet={wallet} data={data} done={close} />
          {wallet && <WalletManage key={`m-${wallet.id}`} wallet={wallet} balance={balance} data={data} done={close} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
