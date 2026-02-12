import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  UsersIcon,
  KeyIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default async function AdminOverviewPage() {
  const userCount = await prisma.user.count();
  const subs = await prisma.subscription.groupBy({
    by: ["status"],
    _count: true,
  });
  const premiumCount = subs.find((s) => s.status === "PREMIUM")?._count ?? 0;
  const proCount = subs.find((s) => s.status === "PRO")?._count ?? 0;
  const kalshiCount = await prisma.kalshiConnection.count();
  const polymarketCount = await prisma.polymarketConnection.count();

  const cards = [
    {
      title: "Users",
      value: String(userCount),
      sub: "Registered accounts",
      href: "/admin/users",
      icon: UsersIcon,
    },
    {
      title: "Subscriptions",
      value: `${premiumCount} Premium · ${proCount} Pro`,
      sub: "Active paid",
      href: "/admin/billing",
      icon: CreditCardIcon,
    },
    {
      title: "Connections",
      value: `${kalshiCount} Kalshi · ${polymarketCount} Polymarket`,
      sub: "Linked accounts",
      href: "/admin/users",
      icon: ChartBarIcon,
    },
    {
      title: "API keys & env",
      value: "Status",
      sub: "Configure in .env",
      href: "/admin/api-keys",
      icon: KeyIcon,
    },
    {
      title: "Settings",
      value: "App config",
      sub: "URLs, feature flags",
      href: "/admin/settings",
      icon: Cog6ToothIcon,
    },
    {
      title: "Permissions",
      value: "Admin access",
      sub: "ADMIN_EMAIL",
      href: "/admin/permissions",
      icon: ShieldCheckIcon,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-dark)] mb-2">
        Overview
      </h2>
      <p className="text-sm text-[var(--text-body)] mb-6">
        Configure API keys, users, settings, billing, and permissions from the
        sections below.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-start gap-4 p-5 rounded-xl border border-[var(--border-color)] bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200">
              <card.icon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[var(--text-dark)]">
                {card.title}
              </h3>
              <p className="text-lg font-semibold text-[var(--text-dark)] tabular-nums mt-0.5">
                {card.value}
              </p>
              <p className="text-xs text-[var(--text-body)] mt-0.5">
                {card.sub}
              </p>
            </div>
            <ArrowRightIcon className="h-5 w-5 text-gray-400 shrink-0 group-hover:text-gray-600" />
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Link
          href="/admin/predictions"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-dark)] hover:underline"
        >
          <ChartBarIcon className="h-4 w-4" />
          Prediction performance dashboard
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
