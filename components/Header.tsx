"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BellIcon, MagnifyingGlassIcon, UserCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SearchResults } from "./SearchResults";
import { OddsGame, LiveGame } from "@/types";

export function Header() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userRole = session?.user?.subscriptionStatus || "Bettor";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    games: (OddsGame | LiveGame)[];
    teams: string[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate total items for keyboard navigation
  const totalItems = (searchResults?.teams.length || 0) + (searchResults?.games.length || 0);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!showResults || !searchResults) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        // Find and click the selected item
        const element = document.querySelector(`[data-search-index="${selectedIndex}"]`) as HTMLElement;
        if (element) {
          element.click();
        }
      } else if (e.key === "Escape") {
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResults, searchResults, selectedIndex, totalItems]);

  // Debounced search with better error handling
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowResults(false);
      setSelectedIndex(-1);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSelectedIndex(-1);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults({
            games: data.games || [],
            teams: data.teams || [],
          });
          setShowResults(true);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Search error:", errorData);
          setSearchResults({ games: [], teams: [] });
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults({ games: [], teams: [] });
        setShowResults(true);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSearchFocus = () => {
    if (searchResults && searchQuery.trim()) {
      setShowResults(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border-gray shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md relative min-w-0" ref={searchRef}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search teams, games..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              className="w-full pl-10 pr-10 py-2.5 bg-body-bg border border-border-gray rounded-lg text-text-dark placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary"></div>
              )}
              {searchQuery && !isSearching && (
                <button
                  onClick={handleClearSearch}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && searchResults && searchQuery.trim() && (
            <SearchResults
              query={searchQuery}
              games={searchResults.games}
              teams={searchResults.teams}
              onClose={() => {
                setShowResults(false);
                setSelectedIndex(-1);
              }}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
            />
          )}
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

