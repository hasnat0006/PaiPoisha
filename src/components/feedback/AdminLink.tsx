// Settings → "Admin dashboard": shown only to accounts listed in public.admins (migration 0007).
"use client";

import { ChartColumn, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSyncStatus } from "@/sync/status";

export function AdminLink({ className }: { className: string }) {
  const t = useTranslations("admin");
  const signedIn = useSyncStatus().state !== "signed_out";
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    import("@/sync/admin")
      .then((m) => m.isAdmin())
      .then((yes) => live && setAdmin(yes), () => {}); // offline: no row this time
    return () => {
      live = false;
    };
  }, [signedIn]);
  if (!signedIn || !admin) return null;
  return (
    <Link href="/admin/" className={`${className} rounded-xl border`}>
      <ChartColumn className="size-5" aria-hidden />
      <span className="flex-1">{t("title")}</span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  );
}
