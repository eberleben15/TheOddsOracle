import { notFound } from "next/navigation";
import { getUpcomingGamesBySport, getLiveGamesBySport } from "@/lib/odds-api";
import { SportsClient } from "./SportsClient";
import { OddsGame, LiveGame } from "@/types";
import { Sport, getSportConfig, SPORT_CONFIGS } from "@/lib/sports/sport-config";
import { getTeamLogoUrl } from "@/lib/sports/unified-sports-api";

// Revalidate every 2 min to avoid constant background flash from frequent RSC re-renders
export const revalidate = 120;

interface SportsPageProps {
  params: Promise<{ sport: string }>;
}

export default async function SportPage({ params }: SportsPageProps) {
  const { sport: sportParam } = await params;
  const sport = sportParam as Sport;

  if (!sport || !(sport in SPORT_CONFIGS)) {
    notFound();
  }

  const config = getSportConfig(sport);
  let upcomingGames: OddsGame[] = [];
  let liveGames: LiveGame[] = [];
  let error: string | null = null;

  try {
    const oddsApiKey = config.oddsApiKey;
    const [live, upcoming] = await Promise.all([
      getLiveGamesBySport(oddsApiKey).catch(() => []),
      getUpcomingGamesBySport(oddsApiKey),
    ]);
    liveGames = live;
    const liveGameIds = new Set(liveGames.map((g) => g.id));
    upcomingGames = upcoming.filter((game) => !liveGameIds.has(game.id));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load games";
    error = errorMessage + ". Please check your API keys in .env.local and restart the dev server.";
    console.error("Error loading games:", err);
  }

  const teamLogos: Record<string, string> = {};
  if (!error && (liveGames.length > 0 || upcomingGames.length > 0)) {
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
        const url = await getTeamLogoUrl(sport, name);
        return { name, url } as const;
      })
    );
    for (const { name, url } of results) {
      if (url) teamLogos[name] = url;
    }
  }

  return (
    <div className="min-h-full bg-body-bg p-4 md:p-6 lg:p-8">
      <SportsClient
        liveGames={liveGames}
        upcomingGames={upcomingGames}
        error={error}
        sport={sport}
        teamLogos={teamLogos}
      />
    </div>
  );
}
