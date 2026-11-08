"use client";

// Google sends the user back here. supabase-js swaps the one-time code for a session (in the browser,
// no server), then we go Home; the sync runner starts the first sync on its own. Backing out of Google lands
// here too, with no session: Home then shows the welcome page again, with no error (spec §1).
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const t = useTranslations("welcome");
  const router = useRouter();
  useEffect(() => {
    import("@/sync/auth")
      .then((m) => m.finishSignIn())
      .catch(() => false)
      .finally(() => router.replace("/"));
  }, [router]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4">
      <p role="status" className="text-muted-foreground">{t("signingIn")}</p>
    </main>
  );
}
