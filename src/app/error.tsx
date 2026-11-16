"use client";
// Any screen that crashes shows this inside the app (tab bar stays), in the user's language.
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error }: { error: unknown }) {
  const t = useTranslations("common");
  useEffect(() => reportError(error), [error]); // fires window "error", so crash reports count it too
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">{t("crashTitle")}</h1>
      <p className="text-muted-foreground">{t("crashBody")}</p>
      <Button className="h-11 min-w-32" onClick={() => window.location.reload()}>
        {t("reload")}
      </Button>
    </main>
  );
}
