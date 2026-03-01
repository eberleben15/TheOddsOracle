"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
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
  CpuChipIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  BeakerIcon,
  ServerStackIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

const nav: NavEntry[] = [
  { name: "Overview", href: "/admin", icon: HomeIcon },
  {
    name: "Model",
    icon: BeakerIcon,
    items: [
      { name: "Performance", href: "/admin/model-performance", icon: SparklesIcon },
      { name: "ATS Feedback", href: "/admin/ats-feedback", icon: AdjustmentsHorizontalIcon },
      { name: "Player Props", href: "/admin/player-props", icon: UserGroupIcon },
      { name: "Line Movement", href: "/admin/line-movement", icon: ArrowTrendingUpIcon },
      { name: "Decision Engine", href: "/admin/decision-engine-performance", icon: BoltIcon },
      { name: "Monte Carlo", href: "/admin/monte-carlo", icon: CpuChipIcon },
    ],
  },
  {
    name: "Data",
    icon: ChartBarIcon,
    items: [
      { name: "Predictions", href: "/admin/predictions", icon: ChartBarIcon },
      { name: "Bets", href: "/admin/bets", icon: CurrencyDollarIcon },
    ],
  },
  {
    name: "System",
    icon: ServerStackIcon,
    items: [
      { name: "Cron Jobs", href: "/admin/cron", icon: ClockIcon },
      { name: "API Keys & Env", href: "/admin/api-keys", icon: KeyIcon },
      { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon },
    ],
  },
  {
    name: "Access",
    icon: UserGroupIcon,
    items: [
      { name: "Users", href: "/admin/users", icon: UsersIcon },
      { name: "Permissions", href: "/admin/permissions", icon: ShieldCheckIcon },
      { name: "Billing", href: "/admin/billing", icon: CreditCardIcon },
    ],
  },
];

function NavDropdown({ 
  group, 
  pathname,
  openDropdown,
  setOpenDropdown,
}: { 
  group: NavGroup; 
  pathname: string;
  openDropdown: string | null;
  setOpenDropdown: (name: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = openDropdown === group.name;

  const isActive = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(isOpen ? null : group.name);
  }, [isOpen, group.name, setOpenDropdown]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
          isActive
            ? "border-[var(--text-dark)] text-[var(--text-dark)]"
            : "border-transparent text-[var(--text-body)] hover:text-[var(--text-dark)]"
        }`}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        {group.name}
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1"
          style={{ zIndex: 9999 }}
        >
          {group.items.map((item) => {
            const current = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenDropdown(null)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  current
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown]);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  return (
    <nav 
      ref={navRef}
      className="flex gap-1 -mb-px relative" 
      aria-label="Admin sections"
      style={{ overflow: 'visible' }}
    >
      {nav.map((entry) => {
        if (isGroup(entry)) {
          return (
            <NavDropdown 
              key={entry.name} 
              group={entry} 
              pathname={pathname}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
          );
        }

        const current = pathname === entry.href;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              current
                ? "border-[var(--text-dark)] text-[var(--text-dark)]"
                : "border-transparent text-[var(--text-body)] hover:text-[var(--text-dark)]"
            }`}
          >
            <entry.icon className="h-4 w-4 shrink-0" />
            {entry.name}
          </Link>
        );
      })}
    </nav>
  );
}
