import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="space-y-8">
        {/* Welcome skeleton */}
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-gray-50 rounded animate-pulse mb-8" />

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <LoadingSkeleton type="card" count={4} />
        </div>

        {/* Open positions + Quick actions placeholders */}
        <div className="h-24 bg-gray-50 rounded-xl border border-gray-100 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <LoadingSkeleton type="card" count={6} />
        </div>

        {/* Games section */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <LoadingSkeleton type="card" count={6} />
          </div>
        </div>
      </div>
    </div>
  );
}

