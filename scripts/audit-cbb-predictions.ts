#!/usr/bin/env npx tsx
/**
 * College Basketball Prediction Audit Script
 *
 * Delegates to the generic audit script with sport=basketball_ncaab.
 *
 * Usage:
 *   npx tsx scripts/audit-cbb-predictions.ts
 *   npx tsx scripts/audit-cbb-predictions.ts --days 60
 */

import "dotenv/config";
import { execSync } from "child_process";
import * as path from "path";

const scriptDir = path.resolve(__dirname);
const auditScript = path.join(scriptDir, "audit-predictions.ts");

function main() {
  const args = process.argv.slice(2);
  const cmd = ["npx", "tsx", auditScript, "--sport", "basketball_ncaab", ...args];
  execSync(cmd.join(" "), {
    stdio: "inherit",
    cwd: path.resolve(scriptDir, ".."),
  });
}

main();
