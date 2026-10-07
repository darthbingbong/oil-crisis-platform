# Phase 1 Summary — Crisis Event → Oil Price Model

## What was built
- `oil_daily_prices.csv` — real daily WTI/Brent prices, 1986–2026 (EIA)
- `events.csv` — 24 real historical oil-market events (1973–2026), hand-compiled and
  verified against real sources: wars, sanctions, strikes, natural disasters, financial
  crises, and one deliberate policy countermeasure (the 2022 SPR release)
- `phase1_analysis.py` — joins events to real prices, compares a formula baseline
  against a trained model, all validated with leave-one-out cross-validation
  (appropriate given how few labeled events exist)
- `price_surge_baseline.joblib` — the elasticity formula, packaged for Phase 2
- `price_surge_experimental.joblib` — the trained correction model + scaler,
  kept for future work but NOT currently recommended for production

## The core question
Can a model that *learns* from historical events predict 30-day oil price moves
better than the simple textbook formula (`%ΔP = %ΔS / |Ed|`, with `Ed ≈ -0.15`)?

## What was tried, and what happened
| Approach | Result (Mean Absolute Error, 30-day) |
|---|---|
| Formula alone | **13.09** |
| Ridge model, unscaled features | 24.41 (worse) |
| Ridge model, scaled + tuned | 13.77 (close, but still worse) |
| Formula + learned per-feature correction | 13.80 (close, but still worse) |
| Formula + simplest possible constant correction | 13.62 (still worse) |
| Same model, 90-day horizon instead of 30-day | 18.01 baseline / 18.15 model (worse on both counts) |

## The honest conclusion
**The plain elasticity formula is currently the best predictor available**, and it
held up against every reasonable attempt to beat it. This is not a failure of the
project — it's a real, evidence-based finding: with 21 usable daily-resolution
events and 4 features (`supply_loss_pct`, `conflict_intensity`, `detour_days`,
`demand_change_pct`), there isn't enough signal yet to reliably outperform theory.

One genuine insight did survive the process: when a model was allowed to learn
anything at all, **`demand_change_pct` consistently came out as the strongest
factor** — confirming that demand-driven events (COVID, 2008) behave differently
from supply-driven ones, which the formula alone cannot distinguish. That's a
real, defensible piece of domain knowledge, even though it wasn't enough data to
turn into a reliably better predictor yet.

## What would likely help, if resumed later
- **More events** — every addition changes leave-one-out results meaningfully at
  this size; 21 is still a small sample
- **Better severity estimates** — several `supply_loss_pct` / `conflict_intensity`
  values in `events.csv` are informed estimates, not verified figures; tightening
  these (especially the still-unfolding 2026 event) would help
- **New features the current set is missing** — e.g. OPEC spare capacity at the
  time of the event, how quickly the disruption was resolved, or a market-panic
  proxy like VIX on the event date
- **A different target entirely** — e.g. predicting price *volatility* over the
  following month rather than the raw percentage change, which may be more
  learnable from few examples

## Recommendation for Phase 2
Wrap `price_surge_baseline.joblib` (the formula) as the live predictor behind
`POST /api/v1/simulate`. Keep `price_surge_experimental.joblib` available but
inactive — worth revisiting once the events table grows, not before.
