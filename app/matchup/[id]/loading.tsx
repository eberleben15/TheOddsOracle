import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function MatchupLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <LoadingSkeleton type="matchup" count={1} />
      </div>
    </div>
  );
}

