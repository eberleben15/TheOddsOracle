# Prediction Methods Layer

Modular, auditable prediction methods for The Odds Oracle. Each component (calibration, win probability, spread cover, total) has typed interfaces and versioned metadata for traceability and funding readiness.

## Structure

| File | Purpose |
|------|---------|
| `types.ts` | Interfaces: `MethodMetadata`, `CalibrationParams`, `CalibrationMethod` |
| `registry.ts` | Central registry of methods; used by admin API |
| `platt-calibration.ts` | Wrapper around `lib/recalibration.ts` |
| `isotonic-calibration.ts` | Nonparametric isotonic regression (PAV) |

## Calibration Methods

### Platt Scaling (Parametric)
- Formula: `p_cal = 1 / (1 + exp(-(A*logit(p) + B)))`
- Fits A, B via log-loss minimization
- Default when no method is configured

### Isotonic Regression (Nonparametric)
- Learns monotone step function from data
- Uses Pool Adjacent Violators (PAV) algorithm
- Often better when miscalibration is non-linear

## Adding a New Method

1. Create `lib/methods/your-method.ts`
2. Implement the interface from `types.ts`
3. Register in `registry.ts`
4. Add to config storage and recalibration dispatch in `lib/recalibration.ts`
5. Update admin Methods page to display

## Enabling Isotonic

To use isotonic calibration, you need 20+ validated predictions. Either:

1. Run **Train Model** on Admin → Model Performance, or  
2. Run the batch sync job (`POST /api/admin/predictions/batch-sync?mode=train`)

When you visit Admin → Methods, `ensureCalibrationConfig()` will migrate from legacy Platt if needed, fitting isotonic from validated predictions so you can switch without re-running training.

## Config Storage

Calibration config is persisted via `lib/prediction-feedback-batch.ts` and `ModelConfig` table:
- `recalibration_platt` - Platt params (legacy)
- `calibration_config` - Method + params (platt | isotonic)

See `docs/METHODS_ARCHITECTURE.md` for full architecture.
