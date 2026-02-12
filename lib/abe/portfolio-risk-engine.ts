/**
 * Portfolio risk engine (ABE).
 * Correlation-aware exposure, concentration risk, and warnings.
 */

import type {
  ABEContract,
  ABEPosition,
  ABEPortfolio,
  FactorExposure,
  ContractCorrelation,
  PortfolioRiskReport,
  VarianceCurve,
} from "@/types/abe";
import { getFactorName } from "./factors";
import { computeAvgLockupDays } from "./bankroll-engine";

/** Notional for a position: size × cost per share (what user has at risk). */
function positionNotional(pos: ABEPosition): number {
  return pos.size * pos.costPerShare;
}

/** Build a map contractId -> contract. */
function contractMap(contracts: ABEContract[]): Map<string, ABEContract> {
  const m = new Map<string, ABEContract>();
  for (const c of contracts) m.set(c.id, c);
  return m;
}

/**
 * Compute total notional and per-contract notionals from portfolio.
 */
function computeNotionals(
  portfolio: ABEPortfolio
): { total: number; byContract: Map<string, number> } {
  const byContract = new Map<string, number>();
  let total = 0;
  for (const pos of portfolio.positions) {
    const n = positionNotional(pos);
    byContract.set(pos.contractId, (byContract.get(pos.contractId) ?? 0) + n);
    total += n;
  }
  return { total, byContract };
}

/**
 * Factor exposures: group notional by factor (using contract factorIds).
 */
function computeFactorExposures(
  portfolio: ABEPortfolio,
  byContract: Map<string, number>,
  totalNotional: number
): FactorExposure[] {
  const contracts = portfolio.contracts ?? [];
  const contractById = contractMap(contracts);

  const byFactor = new Map<string, { notional: number; contractIds: Set<string> }>();

  for (const [contractId, notional] of byContract) {
    const contract = contractById.get(contractId);
    const factorIds = contract?.factorIds?.length
      ? contract.factorIds
      : ["other"];

    for (const fid of factorIds) {
      if (!byFactor.has(fid)) {
        byFactor.set(fid, { notional: 0, contractIds: new Set() });
      }
      const rec = byFactor.get(fid)!;
      rec.notional += notional;
      rec.contractIds.add(contractId);
    }
  }

  return Array.from(byFactor.entries()).map(([factorId, { notional, contractIds }]) => ({
    factorId,
    factorName: getFactorName(factorId),
    notional,
    fraction: totalNotional > 0 ? notional / totalNotional : 0,
    contractIds: Array.from(contractIds),
  }));
}

/**
 * Correlation between two contracts: same factor => high correlation; same event (same ticker prefix) => 1.
 * Simplified: we don't have empirical correlation matrix yet, so we use same-event and same-factor heuristics.
 */
function estimateCorrelation(
  idA: string,
  idB: string,
  contractById: Map<string, ABEContract>
): number {
  if (idA === idB) return 1;

  const contractA = contractById.get(idA);
  const contractB = contractById.get(idB);

  // Same Kalshi event (e.g. kalshi:EVENT123:yes vs kalshi:EVENT123:no) => -1 (yes/no opposite)
  const tickerA = idA.startsWith("kalshi:") ? idA.split(":")[1] : "";
  const tickerB = idB.startsWith("kalshi:") ? idB.split(":")[1] : "";
  if (tickerA && tickerB) {
    const baseA = tickerA.replace(/:yes|:no$/, "");
    const baseB = tickerB.replace(/:yes|:no$/, "");
    if (baseA === baseB) return -1; // same market, opposite sides
    // Same event prefix (e.g. KXBTC-24 vs KXBTC-25) could be correlated; use factor overlap
  }

  // Same Polymarket condition (polymarket:conditionId:yes vs :no) => -1
  const pmMatchA = /^polymarket:(.+):(yes|no)$/.exec(idA);
  const pmMatchB = /^polymarket:(.+):(yes|no)$/.exec(idB);
  if (pmMatchA && pmMatchB && pmMatchA[1] === pmMatchB[1]) {
    return -1; // same market, opposite sides
  }

  const factorsA = new Set(contractA?.factorIds ?? ["other"]);
  const factorsB = new Set(contractB?.factorIds ?? ["other"]);
  const overlap = [...factorsA].filter((f) => factorsB.has(f)).length;
  if (overlap > 0 && factorsA.has("other") === false && factorsB.has("other") === false) {
    return 0.3 + 0.5 * Math.min(1, overlap / 2); // 0.3–0.8 for same-factor
  }

  return 0;
}

/**
 * Top pairwise correlations for the portfolio (only between contracts we have positions in).
 */
function computeCorrelations(
  portfolio: ABEPortfolio,
  byContract: Map<string, number>
): ContractCorrelation[] {
  const contracts = portfolio.contracts ?? [];
  const contractById = contractMap(contracts);
  const ids = Array.from(byContract.keys());

  const pairs: ContractCorrelation[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const corr = estimateCorrelation(ids[i], ids[j], contractById);
      if (Math.abs(corr) >= 0.2) {
        pairs.push({
          contractIdA: ids[i],
          contractIdB: ids[j],
          correlation: corr,
          reason: corr === -1 ? "same_event_opposite_side" : "same_factor",
        });
      }
    }
  }
  return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Concentration risk: fraction of notional in the single largest factor. [0, 1].
 */
function computeConcentrationRisk(factorExposures: FactorExposure[]): number {
  if (factorExposures.length === 0) return 0;
  const maxFraction = Math.max(...factorExposures.map((e) => e.fraction));
  return maxFraction;
}

/**
 * Generate human-readable warnings (overexposure, concentration).
 */
function generateWarnings(
  factorExposures: FactorExposure[],
  concentrationRisk: number,
  totalNotional: number
): string[] {
  const warnings: string[] = [];
  const concentrationThreshold = 0.5;
  const singleFactorWarningThreshold = 0.6;

  if (concentrationRisk >= concentrationThreshold) {
    const top = factorExposures.sort((a, b) => b.fraction - a.fraction)[0];
    if (top) {
      warnings.push(
        `High concentration: ${(top.fraction * 100).toFixed(0)}% of portfolio is in "${top.factorName}". Consider diversifying.`
      );
    }
  }

  for (const exp of factorExposures) {
    if (exp.fraction >= singleFactorWarningThreshold && exp.factorId !== "other") {
      warnings.push(
        `Overexposure to "${exp.factorName}": ${(exp.fraction * 100).toFixed(0)}% of notional ($${exp.notional.toFixed(0)}).`
      );
    }
  }

  if (totalNotional <= 0 && factorExposures.length > 0) {
    warnings.push("Portfolio has no notional; add positions to see risk metrics.");
  }

  return warnings;
}

/**
 * Compute portfolio variance and variance curve from positions and correlations.
 * Binary positions: P&L variance per position = size² × p × (1-p) with p = costPerShare.
 */
function computeVarianceCurve(
  portfolio: ABEPortfolio,
  byContract: Map<string, number>,
  contractById: Map<string, ABEContract>
): VarianceCurve | undefined {
  const positions = portfolio.positions;
  if (positions.length === 0) return undefined;

  const n = positions.length;
  const sigmas: number[] = [];
  const contractIds: string[] = [];

  for (const pos of positions) {
    const p = pos.costPerShare;
    const variance = pos.size * pos.size * p * (1 - p);
    sigmas.push(Math.sqrt(variance));
    contractIds.push(pos.contractId);
  }

  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    portfolioVariance += sigmas[i] * sigmas[i];
    for (let j = i + 1; j < n; j++) {
      const rho = estimateCorrelation(contractIds[i], contractIds[j], contractById);
      portfolioVariance += 2 * rho * sigmas[i] * sigmas[j];
    }
  }

  if (portfolioVariance <= 0) return undefined;
  const volatilityUsd = Math.sqrt(portfolioVariance);
  return {
    volatilityUsd,
    p5PnlUsd: -1.65 * volatilityUsd,
    p95PnlUsd: 1.65 * volatilityUsd,
  };
}

/**
 * Run the portfolio risk engine: exposure, correlation, concentration, warnings, variance curve.
 */
export function runPortfolioRiskAnalysis(portfolio: ABEPortfolio): PortfolioRiskReport {
  const { total: totalNotional, byContract } = computeNotionals(portfolio);
  const contracts = portfolio.contracts ?? [];
  const contractById = contractMap(contracts);

  const factorExposures = computeFactorExposures(
    portfolio,
    byContract,
    totalNotional
  );

  const correlations = computeCorrelations(portfolio, byContract);
  const concentrationRisk = computeConcentrationRisk(factorExposures);
  const warnings = generateWarnings(
    factorExposures,
    concentrationRisk,
    totalNotional
  );

  const varianceCurve = computeVarianceCurve(portfolio, byContract, contractById);
  const avgLockupDays = computeAvgLockupDays(portfolio.positions, contracts);

  return {
    totalNotional,
    factorExposures,
    correlations,
    concentrationRisk,
    warnings,
    suggestedFactorCap: 0.4,
    varianceCurve,
    avgLockupDays,
  };
}
