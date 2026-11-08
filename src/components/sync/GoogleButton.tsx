// "Continue with Google": leaves for Google's sign-in page. Disabled with "Needs internet" when offline (spec §1).
"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/sync/useOnline";

export function GoogleButton() {
  const t = useTranslations("welcome");
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    try {
      await (await import("@/sync/auth")).signInWithGoogle(); // the page navigates away on success
    } catch {
      notify.error(t("signInError"));
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <Button className="min-h-12 w-full text-base" disabled={!online || busy} onClick={signIn}>
        <LogIn className="size-5" aria-hidden />
        {t("google")}
      </Button>
      {!online && <p className="text-center text-sm text-muted-foreground">{t("needsInternet")}</p>}
    </div>
  );
}
