import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-utils";
import { PredictionDetailClient } from "./PredictionDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PredictionDetailPage({ params }: PageProps) {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  const { id } = await params;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <PredictionDetailClient predictionId={id} />
    </div>
  );
}
