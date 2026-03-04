# Prediction Methods Architecture

Modular, auditable prediction methods layer for The Odds Oracle. Enables traceability, pluggable calibration, and funding-ready documentation.

## Overview

The methods layer provides:

1. **Typed interfaces** for calibration, win probability, spread cover, and total
2. **Method registry** for admin display and traceability
3. **Pluggable calibration** — Platt (parametric) and Isotonic (nonparametric)
4. **Config storage** — persisted in `ModelConfig` table via `calibration_config` key

## Structure

```
lib/methods/
├── types.ts              # MethodMetadata, CalibrationParams, CalibrationMethod
├── registry.ts           # getAllMethodsMetadata, listCalibrationMethods
├── platt-calibration.ts  # Wrapper around lib/recalibration
├── isotonic-calibration.ts # PAV-based isotonic regression
├── index.ts              # Exports
└── README.md
```

## Calibration Flow

1. **Training** (batch sync): Fits both Platt and Isotonic from validated predictions. Saves full config to `calibration_config` with `activeMethod: "platt"` (default).

2. **Load** (request start): `loadRecalibrationFromDb()` loads `calibration_config`, calls `setCalibrationConfig()`. Falls back to legacy `recalibration_platt` if config missing.

3. **Apply** (predictMatchup): `applyCalibration(rawProb)` dispatches to Platt or Isotonic based on config.

4. **Admin** (Methods page): Can switch `activeMethod` via PATCH `/api/admin/methods/config`. No re-training required when both are already fitted.

## Stored Config Shape

```ts
interface StoredCalibrationConfig {
  activeMethod: "platt" | "isotonic";
  platt?: { A: number; B: number };
  isotonic?: { bins: Array<{ lower: number; upper: number; calibrated: number }> };
  metadata?: { trainedAt: string; validatedCount: number; brierScore?: number; logLoss?: number };
}
```

## Adding a New Calibration Method

1. Create `lib/methods/my-calibration.ts` with `fit` and `apply` functions
2. Add metadata to `lib/methods/registry.ts`
3. Extend `CalibrationParams` in `types.ts`
4. Add dispatch in `lib/recalibration.ts` `applyCalibration`
5. Add load/save support in `lib/prediction-feedback-batch.ts`
6. Update admin Methods page UI

## Traceability

- `PredictionTrace.calibrationMethod` records which method was used (`'platt' | 'isotonic'`)
- Config stores `trainedAt` and `validatedCount` for reproducibility
- Admin Methods page shows formulae, coefficients, and method registry
