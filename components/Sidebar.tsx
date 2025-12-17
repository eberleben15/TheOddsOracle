"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  ChevronDownIcon, 
  HomeIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon
} from "@heroicons/react/24/outline";

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    { 
      name: "Dashboard", 
      href: "/", 
      icon: HomeIcon, 
      current: pathname === "/" 
    },
    {
      name: "Sports",
      icon: ChartBarIcon,
      children: [
        { name: "College Basketball", href: "/", current: pathname === "/" },
        { name: "NBA", href: "#", disabled: true },
        { name: "NFL", href: "#", disabled: true },
        { name: "College Football", href: "#", disabled: true },
      ]
    },
    { 
      name: "Settings", 
      href: "/settings", 
      icon: Cog6ToothIcon, 
      current: pathname === "/settings",
      disabled: true 
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
                      : item.disabled
                      ? "text-gray-400 cursor-not-allowed opacity-50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                  onClick={(e) => item.disabled && e.preventDefault()}
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span className="font-medium">{item.name}</span>
                  {item.disabled && (
                    <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => setSportsOpen(!sportsOpen)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span className="font-medium flex-1 text-left">{item.name}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${sportsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {sportsOpen && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm
                            ${child.current
                              ? "bg-gray-100 text-gray-900 border-l-4 border-gray-400"
                              : child.disabled
                              ? "text-gray-400 cursor-not-allowed opacity-50"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }
                          `}
                          onClick={(e) => child.disabled && e.preventDefault()}
                        >
                          <span>{child.name}</span>
                          {child.disabled && (
                            <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                              Soon
                            </span>
                          )}
                        </Link>
                      ))}
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

