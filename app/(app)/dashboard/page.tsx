import { isAdmin } from "@/lib/admin-utils";
import { DashboardHome } from "./DashboardHome";
import { getLiveGamesBySport, getUpcomingGamesBySport } from "@/lib/odds-api";
import { getSportConfig } from "@/lib/sports/sport-config";

export default async function DashboardPage() {
  const admin = await isAdmin();
  let liveCount = 0;
  let upcomingCount = 0;

  try {
    const config = getSportConfig("cbb");
    const [live, upcoming] = await Promise.all([
      getLiveGamesBySport(config.oddsApiKey).catch(() => []),
      getUpcomingGamesBySport(config.oddsApiKey),
    ]);
    liveCount = live.length;
    const liveIds = new Set(live.map((g) => g.id));
    upcomingCount = upcoming.filter((g) => !liveIds.has(g.id)).length;
  } catch {
    // Non-blocking: show 0 if Odds API fails
  }

  return (
    <div className="min-h-full bg-[var(--body-bg)] p-4 md:p-6 lg:p-8">
      <DashboardHome isAdmin={admin} liveCount={liveCount} upcomingCount={upcomingCount} />
    </div>
  );
}
