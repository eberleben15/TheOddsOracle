import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingSkeleton type="card" count={3} />
        </div>
        
        {/* Games Grid Skeleton */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <LoadingSkeleton type="card" count={6} />
          </div>
        </div>
      </div>
    </div>
  );
}

