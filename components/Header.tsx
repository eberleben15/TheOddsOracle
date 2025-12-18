"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { BellIcon, MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export function Header() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userRole = session?.user?.subscriptionStatus || "Bettor";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border-gray shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search teams, games..."
              className="w-full pl-10 pr-4 py-2 bg-body-bg border border-border-gray rounded-lg text-text-dark placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-colors"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4 ml-6">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-body-bg transition-colors">
            <BellIcon className="h-6 w-6 text-text-body" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-gray-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <Link
            href="/account"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-body-bg transition-colors"
          >
            <UserCircleIcon className="h-8 w-8 text-text-body" />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-text-dark">{userName}</p>
              <p className="text-xs text-text-body">{userRole}</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

