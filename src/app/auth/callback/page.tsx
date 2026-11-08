"use client";

// Google sends the user back here. supabase-js swaps the one-time code for a session (in the browser,
// no server), then we go Home; the sync runner starts the first sync on its own. Backing out of Google lands
// here too, with no session: Home then shows the welcome page again, with no error (spec §1). A real failure
// shows a red toast, which stays up across the move to Home.
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { notify } from "@/components/common/notify";
import { signInOutcome } from "@/lib/signIn";

export default function AuthCallbackPage() {
  const t = useTranslations("welcome");
  const router = useRouter();
  const started = useRef(false); // `t` changes once the language loads; finish the sign-in only once
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { search, hash } = window.location; // read before supabase-js tidies the URL
    import("@/sync/auth")
      .then((m) => m.finishSignIn())
      .catch(() => false)
      .then((hasSession) => {
        if (signInOutcome(search, hash, hasSession) === "failed") notify.error(t("signInFailed"));
      })
      .finally(() => router.replace("/"));
  }, [router, t]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4">
      <p role="status" className="text-muted-foreground">{t("signingIn")}</p>
    </main>
  );
}
