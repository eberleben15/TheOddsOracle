import { isAdmin } from "@/lib/admin-utils";
import { DashboardHome } from "./DashboardHome";
import { getLiveGamesBySport, getUpcomingGamesBySport } from "@/lib/odds-api";
import { getSportConfig } from "@/lib/sports/sport-config";
import { getTeamLogoUrl } from "@/lib/sports/unified-sports-api";
import type { OddsGame, LiveGame } from "@/types";

export const revalidate = 120;

const DEFAULT_SPORT = "cbb" as const;
const DASHBOARD_UPCOMING_LIMIT = 12;

export default async function DashboardPage() {
  const admin = await isAdmin();
  let liveGames: LiveGame[] = [];
  let upcomingGames: OddsGame[] = [];
  let teamLogos: Record<string, string> = {};
  let gamesError: string | null = null;

  try {
    const config = getSportConfig(DEFAULT_SPORT);
    const [live, upcoming] = await Promise.all([
      getLiveGamesBySport(config.oddsApiKey).catch(() => []),
      getUpcomingGamesBySport(config.oddsApiKey),
    ]);
    liveGames = live;
    const liveIds = new Set(live.map((g) => g.id));
    const upcomingFiltered = upcoming.filter((g) => !liveIds.has(g.id));
    upcomingGames = upcomingFiltered.slice(0, DASHBOARD_UPCOMING_LIMIT);

    if (liveGames.length > 0 || upcomingGames.length > 0) {
      const teamNames = new Set<string>();
      for (const g of upcomingGames) {
        teamNames.add(g.home_team);
        teamNames.add(g.away_team);
      }
      for (const g of liveGames) {
        teamNames.add(g.home_team);
        teamNames.add(g.away_team);
      }
      const results = await Promise.all(
        Array.from(teamNames).map(async (name) => {
          const url = await getTeamLogoUrl(DEFAULT_SPORT, name);
          return { name, url } as const;
        })
      );
      for (const { name, url } of results) {
        if (url) teamLogos[name] = url;
      }
    }
  } catch (err) {
    gamesError = err instanceof Error ? err.message : "Failed to load games";
    console.error("Dashboard games:", err);
  }

  return (
    <div className="min-h-full bg-[var(--body-bg)] p-4 md:p-6 lg:p-8">
      <DashboardHome
        isAdmin={admin}
        liveGames={liveGames}
        upcomingGames={upcomingGames}
        sport={DEFAULT_SPORT}
        teamLogos={teamLogos}
        gamesError={gamesError}
      />
    </div>
  );
}
