// Loading skeleton and error + Retry, shared by every screen that reads the local database.
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function LoadingRows() {
  return (
    <div className="flex flex-col gap-2" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <p>{t("entries.loadError")}</p>
      <Button variant="outline" className="min-h-11 px-6" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
