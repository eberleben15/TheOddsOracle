/**
 * Decision engine benchmark script.
 * Runs the greedy optimizer on a fixed candidate set and constraints,
 * logs solveTimeMs and objectiveValue for reproducibility and future comparison with MIP/quantum.
 *
 * Usage: npx tsx scripts/decision-engine-benchmark.ts [runs=10]
 */

import { runDecisionEngine } from "../lib/abe/decision-engine-runner";
import type { CandidateBet, DecisionEngineConstraints } from "../lib/abe/decision-engine-types";

const RUNS = Math.min(100, Math.max(1, parseInt(process.argv[2] ?? "10", 10) || 10));

/** Fixed candidate set: 25 bets with varying edge and price (deterministic for reproducibility). */
function buildFixedCandidates(): CandidateBet[] {
  const candidates: CandidateBet[] = [];
  const labels = [
    "Team A ML", "Team B +3.5", "Team C -2", "Over 142.5", "Under 138",
    "Team D ML", "Team E +1.5", "Team F -5", "Over 155", "Under 148",
    "Team G ML", "Team H +7", "Team I -3.5", "Over 160", "Under 152",
    "Team J ML", "Team K +4", "Team L -1", "Over 145", "Under 141",
    "Team M ML", "Team N +2.5", "Team O -4", "Over 150", "Under 144",
  ];
  for (let i = 0; i < 25; i++) {
    const price = 0.4 + (i % 6) * 0.05;
    const edge = 0.01 + (i % 5) * 0.005;
    candidates.push({
      id: `fixed-${i}`,
      source: "sportsbook",
      label: labels[i] ?? `Bet ${i}`,
      winProb: Math.min(0.98, price + edge),
      price,
      edge,
      variancePerDollar: price * (1 - price),
      factorIds: [`game-${Math.floor(i / 5)}`],
    });
  }
  return candidates;
}

const FIXED_CONSTRAINTS: DecisionEngineConstraints = {
  bankrollUsd: 2000,
  kellyFraction: 0.25,
  maxFractionPerPosition: 0.02,
  maxPositions: 12,
  maxFactorFraction: 0.4,
};

async function main() {
  const candidates = buildFixedCandidates();
  const times: number[] = [];
  const objectives: number[] = [];
  let positionsCount = 0;

  for (let r = 0; r < RUNS; r++) {
    const result = await runDecisionEngine(candidates, FIXED_CONSTRAINTS);
    if (result.solveTimeMs != null) times.push(result.solveTimeMs);
    if (result.objectiveValue != null) objectives.push(result.objectiveValue);
    if (r === 0) positionsCount = result.positions.length;
  }

  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const stdTime =
    times.length > 1
      ? Math.sqrt(
          times.reduce((s, t) => s + (t - avgTime) ** 2, 0) / (times.length - 1)
        )
      : 0;
  const avgObj =
    objectives.length
      ? objectives.reduce((a, b) => a + b, 0) / objectives.length
      : 0;
  const stdObj =
    objectives.length > 1
      ? Math.sqrt(
          objectives.reduce((s, o) => s + (o - avgObj) ** 2, 0) /
            (objectives.length - 1)
        )
      : 0;

  const summary = {
    timestamp: new Date().toISOString(),
    solver: "classical-greedy",
    runs: RUNS,
    candidatesCount: candidates.length,
    constraints: FIXED_CONSTRAINTS,
    positionsSelected: positionsCount,
    solveTimeMs: { mean: Math.round(avgTime * 100) / 100, std: Math.round(stdTime * 100) / 100 },
    objectiveValue: { mean: Math.round(avgObj * 100) / 100, std: Math.round(stdObj * 100) / 100 },
  };

  console.log("Decision engine benchmark (fixed inputs)");
  console.log("========================================");
  console.log(`Solver: ${summary.solver}`);
  console.log(`Runs: ${summary.runs}, Candidates: ${summary.candidatesCount}`);
  console.log(`Positions selected: ${summary.positionsSelected}`);
  console.log(
    `Solve time (ms): mean = ${summary.solveTimeMs.mean}, std = ${summary.solveTimeMs.std}`
  );
  console.log(
    `Objective value: mean = ${summary.objectiveValue.mean}, std = ${summary.objectiveValue.std}`
  );

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "scripts", "decision-engine-benchmark-result.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
