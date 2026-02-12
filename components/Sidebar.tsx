"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  ChevronDownIcon, 
  HomeIcon, 
  ChartBarIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { Sport, SPORT_CONFIGS } from "@/lib/sports/sport-config";

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Prediction Markets": true,
    Sports: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const isSportsPage = pathname.startsWith("/sports/");
  const isPredictionMarkets = pathname.startsWith("/prediction-markets") && pathname !== "/prediction-markets/portfolio";

  const navigation = [
    { 
      name: "Dashboard", 
      href: "/dashboard", 
      icon: HomeIcon, 
      current: isDashboard
    },
    {
      name: "AI Chat",
      href: "/chat",
      icon: ChatBubbleLeftRightIcon,
      current: pathname === "/chat"
    },
    {
      name: "Prediction Markets",
      href: "/prediction-markets",
      icon: ArrowTrendingUpIcon,
      current: isPredictionMarkets,
      children: [
        { name: "Kalshi", href: "/prediction-markets/kalshi", current: pathname === "/prediction-markets/kalshi" },
        { name: "Polymarket", href: "/prediction-markets/polymarket", current: pathname === "/prediction-markets/polymarket" },
      ]
    },
    {
      name: "Portfolio Risk",
      href: "/prediction-markets/portfolio",
      icon: ChartPieIcon,
      current: pathname === "/prediction-markets/portfolio"
    },
    {
      name: "Strategy Simulator",
      href: "/prediction-markets/simulator",
      icon: ChartBarIcon,
      current: pathname === "/prediction-markets/simulator"
    },
    {
      name: "Rules",
      href: "/prediction-markets/rules",
      icon: BoltIcon,
      current: pathname === "/prediction-markets/rules"
    },
    {
      name: "Betting DNA",
      href: "/prediction-markets/dna",
      icon: ChartPieIcon,
      current: pathname === "/prediction-markets/dna"
    },
    {
      name: "Sports",
      icon: ChartBarIcon,
      children: [
        { 
          name: "College Basketball", 
          href: "/sports/cbb", 
          current: isSportsPage && pathname === "/sports/cbb",
          sport: "cbb" as Sport
        },
        { 
          name: "NBA", 
          href: "/sports/nba", 
          current: isSportsPage && pathname === "/sports/nba",
          sport: "nba" as Sport
        },
        { 
          name: "NFL", 
          href: "/sports/nfl", 
          current: isSportsPage && pathname === "/sports/nfl",
          sport: "nfl" as Sport,
          disabled: true,
          comingSoon: true
        },
        { 
          name: "NHL", 
          href: "/sports/nhl", 
          current: isSportsPage && pathname === "/sports/nhl",
          sport: "nhl" as Sport
        },
        { 
          name: "MLB", 
          href: "/sports/mlb", 
          current: isSportsPage && pathname === "/sports/mlb",
          sport: "mlb" as Sport,
          disabled: true,
          comingSoon: true
        },
      ]
    },
    { 
      name: "Settings", 
      href: "/settings", 
      icon: Cog6ToothIcon, 
      current: pathname?.startsWith("/settings") ?? false
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 text-text-dark shadow-lg"
      >
        {mobileOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-72 
          bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 shadow-lg
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
          <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              The Odds Oracle
            </h1>
            <p className="text-xs text-gray-500">Smart betting insights</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2 overflow-y-auto h-[calc(100vh-120px)]">
          {navigation.map((item) => (
            <div key={item.name}>
              {!item.children ? (
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${item.current
                      ? "bg-gray-100 text-gray-900"
                      : (item as { disabled?: boolean }).disabled
                      ? "text-gray-400 cursor-not-allowed opacity-50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                  onClick={(e) => (item as { disabled?: boolean }).disabled && e.preventDefault()}
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span className="font-medium">{item.name}</span>
                  {(item as { disabled?: boolean }).disabled && (
                    <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => setOpenSections((prev) => ({ ...prev, [item.name]: !prev[item.name] }))}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="font-medium flex-1 text-left">{item.name}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${openSections[item.name] ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openSections[item.name] && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.children.map((child) =>
                        (child as { disabled?: boolean; comingSoon?: boolean }).disabled ? (
                          <div
                            key={child.name}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed opacity-75"
                          >
                            <span>{child.name}</span>
                            <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
                              Coming Soon
                            </span>
                          </div>
                        ) : (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm
                              ${child.current
                                ? "bg-gray-100 text-gray-900 border-l-4 border-gray-400 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }
                            `}
                            onClick={() => {
                              setMobileOpen(false);
                            }}
                          >
                            <span>{child.name}</span>
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            © 2025 The Odds Oracle
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

