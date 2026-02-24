"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  KeyIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const nav = [
  { name: "Overview", href: "/admin", icon: HomeIcon },
  { name: "Model", href: "/admin/model-performance", icon: SparklesIcon },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  { name: "API keys & env", href: "/admin/api-keys", icon: KeyIcon },
  { name: "Cron jobs", href: "/admin/cron", icon: ClockIcon },
  { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon },
  { name: "Billing", href: "/admin/billing", icon: CreditCardIcon },
  { name: "Permissions", href: "/admin/permissions", icon: ShieldCheckIcon },
  { name: "Predictions", href: "/admin/predictions", icon: ChartBarIcon },
  { name: "Bets", href: "/admin/bets", icon: CurrencyDollarIcon },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto -mb-px" aria-label="Admin sections">
      {nav.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              current
                ? "border-[var(--text-dark)] text-[var(--text-dark)]"
                : "border-transparent text-[var(--text-body)] hover:text-[var(--text-dark)]"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
