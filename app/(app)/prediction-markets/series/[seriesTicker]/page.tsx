import Link from "next/link";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { PredictionMarketsClient } from "../../_components/PredictionMarketsClient";

export const revalidate = 60;

interface SeriesPageProps {
  params: Promise<{ seriesTicker: string }>;
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { seriesTicker } = await params;
  const decodedTicker = decodeURIComponent(seriesTicker);

  let seriesTitle: string | null = null;
  try {
    const client = getKalshiClient();
    const data = await client.getSeriesList({ limit: 500 });
    const found = data.series.find(
      (s) => s.ticker.toUpperCase() === decodedTicker.toUpperCase()
    );
    if (found) seriesTitle = found.title || found.ticker;
  } catch {
    // ignore
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-text-body mb-1">
          <Link href="/prediction-markets" className="hover:text-text-dark">
            Prediction Markets
          </Link>
          <span>/</span>
          <span className="text-text-dark font-medium truncate">
            {seriesTitle || decodedTicker}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-text-dark truncate">
          {seriesTitle || decodedTicker}
        </h1>
        <p className="text-text-body text-sm mt-1">
          Markets in this series. Click a market to view and trade on Kalshi.
        </p>
      </div>
      <PredictionMarketsClient
        seriesTicker={decodedTicker}
        title={undefined}
      />
    </div>
  );
}
