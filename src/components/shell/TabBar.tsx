// Bottom tab bar: Home · Transactions · [+] · Budgets · More, as a floating glass pill above the screen edge
// (user, 2026-11-08). The + is a solid circle in the middle (user, 2026-11-09). The tab bar is the one place
// allowed round shapes; everything else uses rounded-md (user, 2026-11-09).
"use client";

import { House, List, Menu, PiggyBank, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type Tab = { href: string; key: "home" | "transactions" | "budgets" | "more"; icon: LucideIcon; match: string[] };
const LEFT: Tab[] = [
  { href: "/", key: "home", icon: House, match: ["/"] },
  { href: "/transactions/", key: "transactions", icon: List, match: ["/transactions"] },
];
const RIGHT: Tab[] = [
  { href: "/budgets/", key: "budgets", icon: PiggyBank, match: ["/budgets"] },
  { href: "/more/", key: "more", icon: Menu, match: ["/more", "/wallets", "/categories"] },
];

/** `onAdd` is undefined until the data has loaded; the + then shows disabled, so the bar never shifts. */
export function TabBar({ onAdd }: { onAdd?: () => void }) {
  const t = useTranslations();
  const path = (usePathname() ?? "/").replace(/\/$/, "") || "/";
  const tab = ({ href, key, icon: Icon, match }: Tab) => {
    const active = match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
    return (
      <li key={key} className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs leading-tight transition-colors ${active ? "font-semibold text-brand" : "text-muted-foreground"}`}
        >
          <Icon className="size-5" aria-hidden />
          {t(`nav.${key}`)}
          {/* Selected (user, 2026-11-09): brand green + a dot underneath. The dot's space is always kept, so nothing shifts. */}
          <span className={`size-1 rounded-full ${active ? "bg-brand" : "bg-transparent"}`} aria-hidden />
        </Link>
      </li>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 px-4">
      <ul className="mx-auto flex max-w-sm items-center gap-0.5 rounded-full border p-1.5 shadow-lg glass">
        {LEFT.map(tab)}
        <li className="flex shrink-0 justify-center px-1.5">
          <button
            type="button"
            onClick={onAdd}
            disabled={!onAdd}
            aria-label={t("entries.add")}
            className="flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform active:scale-90 disabled:opacity-60"
          >
            <Plus className="size-6" strokeWidth={2.75} aria-hidden />
          </button>
        </li>
        {RIGHT.map(tab)}
      </ul>
    </nav>
  );
}
