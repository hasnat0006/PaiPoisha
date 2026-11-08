"use client";

// Categories screen (spec §4): separate expense and income lists; add, edit, drag to rank, hide.
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SortableCategoryList } from "@/components/categories/SortableCategoryList";
import { notify } from "@/components/common/notify";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadError, LoadingRows } from "@/components/common/ScreenState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, CategoryType } from "@/db/types";
import { listFor, saveCategoryOrder } from "@/features/categories/categoryActions";
import { useEntries } from "@/features/entries/useEntries";
import { useLocale } from "@/i18n/provider";

// The sheet brings the drawer library; load it only when first opened.
const CategorySheet = dynamic(() => import("@/components/categories/CategorySheet").then((m) => m.CategorySheet), { ssr: false });

export default function CategoriesPage() {
  const t = useTranslations();
  const { ready } = useLocale();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const [type, setType] = useState<CategoryType>("expense");
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const edit = (c: Category | null) => {
    setEditing(c);
    setUsed(true);
    setOpen(true);
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <PageHeader title={t("categories.title")} />
      <Tabs value={type} onValueChange={(v) => setType(v as CategoryType)}>
        <TabsList className="w-full group-data-horizontal/tabs:h-11">
          <TabsTrigger value="expense" className="text-base">{t("entries.expense")}</TabsTrigger>
          <TabsTrigger value="income" className="text-base">{t("entries.income")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {state.status === "loading" && <LoadingRows />}
      {state.status === "error" && <LoadError onRetry={state.retry} />}
      {state.status === "ready" && (
        <>
          <SortableCategoryList
            key={type} // a fresh list per tab
            list={listFor(type, state)}
            onEdit={edit}
            onReorder={(list) => saveCategoryOrder(list).catch(() => notify.error(t("common.saveError")))}
          />
          <Button className="min-h-11 text-base" onClick={() => edit(null)}>
            {t("categories.add")}
          </Button>
          {used && <CategorySheet open={open} onOpenChange={setOpen} category={editing} type={type} data={state} />}
        </>
      )}
    </main>
  );
}
