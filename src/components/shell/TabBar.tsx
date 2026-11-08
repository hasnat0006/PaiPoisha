// Bottom tab bar: Home · Transactions · Budgets · More.
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
    <nav className="fixed inset-x-0 bottom-0 z-30 glass border-t pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, key, icon: Icon, match }) => {
          const active = match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}
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
