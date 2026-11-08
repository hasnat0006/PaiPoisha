// Title bar for screens opened from the More tab, with a back link to it.
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <header className="flex items-center gap-2">
      <Link href="/more/" aria-label={t("back")} className="flex size-11 items-center justify-center rounded-md">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="flex-1 text-xl font-semibold">{title}</h1>
      {children}
    </header>
  );
}
