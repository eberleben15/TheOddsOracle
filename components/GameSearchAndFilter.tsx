"use client";

import { useState, useMemo, useEffect } from "react";
import { Input, Select, SelectItem, Button } from "@nextui-org/react";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { OddsGame } from "@/types";

interface GameSearchAndFilterProps {
  games: OddsGame[];
  onFilteredGamesChange: (filteredGames: OddsGame[]) => void;
}

export function GameSearchAndFilter({ games, onFilteredGamesChange }: GameSearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredGames = useMemo(() => {
    let filtered = [...games];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((game) => {
        const awayTeam = game.away_team?.toLowerCase() || "";
        const homeTeam = game.home_team?.toLowerCase() || "";
        return awayTeam.includes(query) || homeTeam.includes(query);
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((game) => {
        if (!game.commence_time) return false;
        const gameDate = new Date(game.commence_time);
        const gameDateOnly = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());

        switch (dateFilter) {
          case "today":
            return gameDateOnly.getTime() === today.getTime();
          case "tomorrow":
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return gameDateOnly.getTime() === tomorrow.getTime();
          case "this_week":
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return gameDate >= today && gameDate <= weekFromNow;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [games, searchQuery, dateFilter]);

  // Notify parent of filtered games (use useEffect for side effects)
  useEffect(() => {
    onFilteredGamesChange(filteredGames);
  }, [filteredGames, onFilteredGamesChange]);

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || dateFilter !== "all";

  return (
    <div className="mb-6 space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by team name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
          className="flex-1 min-w-[200px]"
          size="md"
        />
        <Button
          variant={showFilters ? "solid" : "bordered"}
          onClick={() => setShowFilters(!showFilters)}
          startContent={<FunnelIcon className="h-5 w-5" />}
        >
          Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="light"
            onClick={clearFilters}
            startContent={<XMarkIcon className="h-5 w-5" />}
          >
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Date Range"
              selectedKeys={[dateFilter]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setDateFilter(selected);
              }}
              size="sm"
            >
              <SelectItem key="all" value="all">
                All Dates
              </SelectItem>
              <SelectItem key="today" value="today">
                Today
              </SelectItem>
              <SelectItem key="tomorrow" value="tomorrow">
                Tomorrow
              </SelectItem>
              <SelectItem key="this_week" value="this_week">
                This Week
              </SelectItem>
            </Select>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="text-sm text-gray-600">
          Showing {filteredGames.length} of {games.length} games
        </div>
      )}
    </div>
  );
}

