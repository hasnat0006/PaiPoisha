// Add / edit a category (spec §4): Bangla and/or English name, colour, icon; hide or delete.
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { LookPicker } from "@/components/common/LookPicker";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { Category, CategoryType } from "@/db/types";
import {
  CATEGORY_NAME_MAX, canDeleteCategory, cleanNames, deleteCategory, saveCategory, setHidden, type CategoryFields,
} from "@/features/categories/categoryActions";
import type { EntriesData } from "@/features/entries/useEntries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  type: CategoryType;
  data: EntriesData;
}

export function CategorySheet({ open, onOpenChange, category, type, data }: Props) {
  const t = useTranslations("categories");
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">{category ? t("editTitle") : t("addTitle")}</DrawerTitle>
        </DrawerHeader>
        <CategoryForm key={category?.id ?? "new"} category={category} type={type} data={data} done={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function CategoryForm({ category, type, data, done }: Omit<Props, "open" | "onOpenChange"> & { done: () => void }) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const [d, setD] = useState<CategoryFields>(() =>
    category
      ? { name_bn: category.name_bn, name_en: category.name_en, icon: category.icon, color: category.color }
      : { name_bn: "", name_en: "", icon: "shopping-bag", color: "#0284c7" },
  );
  const [noName, setNoName] = useState(false);
  const set = (c: Partial<CategoryFields>) => {
    setD((x) => ({ ...x, ...c }));
    setNoName(false);
  };

  const run = async (action: () => Promise<unknown>, message: string, failure: "saveError" | "deleteError" = "saveError") => {
    try {
      await action();
      notify.success(message);
      done();
    } catch {
      notify.error(tc(failure));
    }
  };
  const save = () => {
    if (!cleanNames(d)) return (setNoName(true), notify.invalid(t("nameHint")));
    void run(() => saveCategory(d, type, data, category?.id), category ? t("updated") : t("added"));
  };

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Input
        value={d.name_bn ?? ""}
        maxLength={CATEGORY_NAME_MAX}
        onChange={(e) => set({ name_bn: e.target.value })}
        placeholder={t("nameBn")}
        aria-label={t("nameBn")}
        aria-invalid={noName}
        lang="bn"
      />
      <Input
        value={d.name_en ?? ""}
        maxLength={CATEGORY_NAME_MAX}
        onChange={(e) => set({ name_en: e.target.value })}
        placeholder={t("nameEn")}
        aria-label={t("nameEn")}
        aria-invalid={noName}
        lang="en"
      />
      <p className={`text-sm ${noName ? "text-destructive" : "text-muted-foreground"}`} role={noName ? "alert" : undefined}>
        {t("nameHint")}
      </p>
      <LookPicker color={d.color} icon={d.icon} onChange={(c) => set(c)} />
      <Button className="min-h-11 text-base" onClick={save}>
        {tc("save")}
      </Button>
      {category && (
        <div className="flex gap-2">
          <Button variant="outline" className="min-h-11 flex-1" onClick={() => run(() => setHidden(category, !category.hidden), category.hidden ? t("shownToast") : t("hiddenToast"))}>
            {category.hidden ? t("show") : t("hide")}
          </Button>
          <Button
            variant="destructive"
            className="min-h-11 flex-1"
            disabled={!canDeleteCategory(category, data)}
            onClick={() => run(() => deleteCategory(category, data), t("deleted"), "deleteError")}
          >
            {tc("delete")}
          </Button>
        </div>
      )}
      {category && !canDeleteCategory(category, data) && (
        <p className="text-sm text-muted-foreground">{category.is_system ? t("builtIn") : t("hasEntries")}</p>
      )}
    </div>
  );
}
