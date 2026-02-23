# Odds Capture System

Documents how opening and closing lines are captured for CLV (Closing Line Value) analysis.

## Overview

The odds capture system (`lib/odds-history.ts`) fetches odds from the Odds API and stores snapshots in `OddsHistory`. It marks the first snapshot for each game as the **opening line** and snapshots taken within 30 minutes of game start as the **closing line**.

## Opening vs Closing Lines

| Line Type | When Set | Criteria |
|-----------|----------|----------|
| **Opening** | First capture for a game | `existingCount === 0` |
| **Closing** | Pre-game capture | `minutesUntilGame <= 30 && minutesUntilGame > 0` |

When a new closing capture is made, any previous "closing" snapshot for that game is unmarked (so only the most recent pre-game capture is the closing line).

## Cron Frequency Dependency

**Critical:** Closing lines are set only when `captureOddsForSport` runs during the 30-minute window before each game. If the capture cron runs:

- **Every 15–30 min**: Most games will get a closing line.
- **Every hour**: Games that start in the gaps may miss a closing line.
- **Less frequently**: Many games will have no closing line.

### Recommendation

For reliable CLV analysis, schedule the capture-odds cron to run **every 15–30 minutes** on game days (e.g., during typical game hours).

## Implications for CLV

When a game has no closing line:

- `getClosingLine(gameId)` returns `null`
- `recordOutcome` in `prediction-tracker.ts` will not populate `closingSpread`, `closingTotal`, or CLV fields
- Validation metrics that use market lines for ATS/O-U may fall back to the predicted line

## Related Files

- `lib/odds-history.ts` – capture logic, `getOpeningLine`, `getClosingLine`
- `lib/prediction-tracker.ts` – CLV calculation in `recordOutcome`
- `app/api/cron/capture-odds/route.ts` – cron endpoint
