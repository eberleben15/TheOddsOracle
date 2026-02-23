# Prediction Validation - Known Limitations

## Postponed and Cancelled Games

**Status:** Documented limitation.

The Odds API and ESPN/SportsData APIs do not expose explicit "postponed" or "cancelled" status fields in the game response types we consume. As a result:

- **Postponed games:** A game that is postponed may not appear in completed scores until it is played. The prediction will remain unvalidated until the game is rescheduled and completed. If the Odds API or ESPN returns a completed game with placeholder data (e.g., 0-0) for a cancelled game, we would incorrectly validate the prediction.

- **Cancelled games:** Similarly, a cancelled game may never receive final scores. Predictions for cancelled games will remain unvalidated indefinitely unless manually cleared or marked.

**Current behavior:** We only record outcomes when we receive completed games with valid scores (`scores.length >= 2` for Odds API; `IsClosed && HomeTeamScore != null && AwayTeamScore != null` for SportsData). Games that are postponed or cancelled typically do not appear in the completed list with valid scores.

**Future improvement:** If APIs add explicit `postponed` or `cancelled` status fields, we could add an `outcomeStatus` to the Prediction model (e.g., `validated | postponed | cancelled | no_result`) and mark predictions accordingly instead of leaving them unvalidated.
