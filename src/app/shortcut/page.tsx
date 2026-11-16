"use client";

// The iPhone Shortcut guide on one page (user, 2026-11-16): every step with the marked-up iPhone screenshots,
// so people can set it up on their own. The More sheet walks the same steps one at a time.
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/common/PageHeader";
import { SHORTCUT_STEP_COUNT, ShortcutStep } from "@/components/sync/IosShortcut";

export default function ShortcutPage() {
  const t = useTranslations("shortcut");
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 p-4">
      <PageHeader title={t("title")} />
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {Array.from({ length: SHORTCUT_STEP_COUNT }, (_, i) => (
        <ShortcutStep key={i} index={i} live={false} />
      ))}
    </main>
  );
}
