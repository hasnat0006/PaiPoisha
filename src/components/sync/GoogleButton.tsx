// "Continue with Google": leaves for Google's sign-in page. Disabled with "Needs internet" when offline (spec §1).
"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/sync/useOnline";

export function GoogleButton() {
  const t = useTranslations("welcome");
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const useGis = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!useGis || !online || !host.current) return;
    host.current.replaceChildren(); // `t` re-runs this once the language loads
    import("@/sync/auth")
      .then((m) =>
        m.renderGoogleButton(host.current!, (ok) => {
          if (ok) window.location.replace("/"); // Home starts the first sync, like /auth/callback/
          else notify.error(t("signInError"));
        }),
      )
      .catch(() => notify.error(t("signInError")));
  }, [useGis, online, t]);
  if (useGis && online) {
    return <div ref={host} className="flex min-h-12 w-full justify-center" />;
  }
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
