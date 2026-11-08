// Bottom tab bar: Home · Transactions · Budgets · More, as a floating glass pill above the screen edge (user, 2026-11-08).
"use client";

import { House, List, Menu, PiggyBank, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS: { href: string; key: "home" | "transactions" | "budgets" | "more"; icon: LucideIcon; match: string[] }[] = [
  { href: "/", key: "home", icon: House, match: ["/"] },
  { href: "/transactions/", key: "transactions", icon: List, match: ["/transactions"] },
  { href: "/budgets/", key: "budgets", icon: PiggyBank, match: ["/budgets"] },
  { href: "/more/", key: "more", icon: Menu, match: ["/more", "/wallets", "/categories"] },
];

export function TabBar() {
  const t = useTranslations("nav");
  const path = (usePathname() ?? "/").replace(/\/$/, "") || "/";
  return (
    <nav className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 px-4">
      <ul className="mx-auto flex max-w-sm rounded-full border p-1 shadow-lg glass">
        {TABS.map(({ href, key, icon: Icon, match }) => {
          const active = match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-xs ${active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="size-5" aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
