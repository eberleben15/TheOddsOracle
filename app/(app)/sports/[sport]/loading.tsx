import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function SportLoading() {
  return (
    <div className="min-h-full bg-body-bg p-4 md:p-6 lg:p-8">
      <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <LoadingSkeleton type="card" count={6} />
      </div>
    </div>
  );
}
