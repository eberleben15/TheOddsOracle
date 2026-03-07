/**
 * Content for model performance and methods dashboard explanations.
 * Used by MetricExplanationPanel / MetricInfoButton for learning guides.
 */

import React from "react";

export const FACTOR_CONTRIBUTIONS_SECTIONS = [
  {
    title: "What This Chart Shows",
    content: (
      <p>
        This chart shows the <strong>average magnitude</strong> of each factor&apos;s contribution to the win probability score across recent predictions that have trace data. Higher bars mean the factor typically moves the prediction more.
      </p>
    ),
  },
  {
    title: "Factor Definitions",
    content: (
      <div className="space-y-3">
        <div>
          <strong>Four Factors</strong> — Dean Oliver&apos;s framework: shooting (eFG%), turnovers (TOV%), rebounding (ORB%), free throw rate (FTR). The model weights these as 40%, 25%, 20%, 15%. Combined into a single matchup score comparing home vs away.
        </div>
        <div>
          <strong>Efficiency</strong> — Schedule-adjusted offensive and defensive efficiency (points per 100 possessions). Captures net rating and matchup quality when Four Factors data is sparse.
        </div>
        <div>
          <strong>Tempo</strong> — Pace adjustment. Accounts for how possession count affects scoring variance. Slower games tend to be tighter; faster games can widen margins.
        </div>
        <div>
          <strong>Home Adv</strong> — Home court advantage. Typically 3.5 pts (CBB) or 2.5 pts (NBA), scaled down when the away team is heavily favored on the Four Factors score.
        </div>
        <div>
          <strong>Momentum</strong> — Recent form. Blends recent-game performance (last 5–20) with season averages. When teams are trending up or down, this factor adjusts the prediction.
        </div>
      </div>
    ),
  },
  {
    title: "How to Use This",
    content: (
      <p>
        If <strong>Home Adv</strong> dominates, predictions lean heavily on home court. If <strong>Four Factors</strong> or <strong>Efficiency</strong> lead, the model is driven more by matchup analytics. If <strong>Momentum</strong> is high, recent form matters a lot—useful to know when hot/cold streaks are influencing picks.
      </p>
    ),
  },
];

export const CALIBRATION_RELIABILITY_SECTIONS = [
  {
    title: "What Calibration Means",
    content: (
      <p>
        A well-calibrated model is one where <strong>predicted probabilities match observed frequencies</strong>. If the model says 70% win probability for a set of games, roughly 70% of those games should be won by the predicted team.
      </p>
    ),
  },
  {
    title: "Reading the Chart",
    content: (
      <div className="space-y-2">
        <p>
          <strong>Predicted (blue)</strong> — The average predicted probability for games in that bin.
        </p>
        <p>
          <strong>Actual (green)</strong> — The true win rate for those games.
        </p>
        <p>
          <strong>Well-calibrated</strong> = blue and green bars align. If Actual &gt; Predicted in high-probability bins, the model is <em>under-confident</em> (more accurate than it thinks). If Actual &lt; Predicted, it&apos;s <em>over-confident</em>.
        </p>
      </div>
    ),
  },
  {
    title: "ECE (Expected Calibration Error)",
    content: (
      <p>
        ECE is the weighted average of |predicted − actual| across bins. <strong>Lower is better</strong>. Values below 0.05 are strong; 0.02–0.03 is excellent. It quantifies how much predicted probabilities deviate from reality.
      </p>
    ),
  },
  {
    title: "Platt vs Isotonic",
    content: (
      <p>
        <strong>Platt scaling</strong> applies a parametric logistic transform (A, B) to raw probabilities. Works well when miscalibration is roughly logistic-shaped. <strong>Isotonic regression</strong> fits a nonparametric monotone curve and can better handle non-linear miscalibration. Switch to Isotonic if the calibration plot shows clear non-linear deviations. Both are fitted during training.
      </p>
    ),
  },
];

export const BRIER_SECTIONS = [
  {
    title: "Brier Score",
    content: (
      <p>
        Mean squared error of predicted probability vs actual outcome (0 or 1). <strong>Lower is better.</strong> Formula: mean((p − y)²). Perfect predictions = 0; random guessing ≈ 0.25. Industry standard for probability accuracy.
      </p>
    ),
  },
];

export const LOG_LOSS_SECTIONS = [
  {
    title: "Log Loss (Cross-Entropy)",
    content: (
      <p>
        Penalizes <strong>overconfident wrong predictions</strong> heavily. If the model says 95% and loses, the penalty is large. <strong>Lower is better.</strong> Useful for betting because overconfidence in wrong picks is costly.
      </p>
    ),
  },
];

export const BRIER_LOG_LOSS_SECTIONS = [
  {
    title: "Brier Score",
    content: (
      <p>
        Mean squared error of predicted probability vs actual outcome (0 or 1). <strong>Lower is better.</strong> Formula: mean((p − y)²). Perfect predictions = 0; random guessing ≈ 0.25. Industry standard for probability accuracy.
      </p>
    ),
  },
  {
    title: "Log Loss (Cross-Entropy)",
    content: (
      <p>
        Penalizes <strong>overconfident wrong predictions</strong> heavily. If the model says 95% and loses, the penalty is large. <strong>Lower is better.</strong> Useful for betting because overconfidence in wrong picks is costly.
      </p>
    ),
  },
];

export const ECE_SECTIONS = [
  {
    title: "Expected Calibration Error (ECE)",
    content: (
      <p>
        ECE measures how well predicted probabilities match actual frequencies. It bins predictions by probability, then computes the weighted average of |predicted − actual| per bin. <strong>Lower is better.</strong> ECE &lt; 0.03 is considered good; &lt; 0.02 is excellent.
      </p>
    ),
  },
];

export const METRICS_GLOSSARY_SECTIONS = [
  {
    title: "Winner Accuracy",
    content: (
      <p>
        Percentage of games where we correctly predicted the winner. 60%+ is strong; 52%+ is above random. Used to gate recommendations (ATS rules require ~53%+ for spread picks).
      </p>
    ),
  },
  {
    title: "Spread MAE",
    content: (
      <p>
        Mean absolute error of predicted margin (spread). Lower = more accurate score/margin predictions. Typical good values: 8–12 points for CBB/NBA.
      </p>
    ),
  },
  {
    title: "ATS Win Rate",
    content: (
      <p>
        Against the spread: % of spread picks that covered. 53%+ meets our performance gate for recommendations. Pushes excluded from the rate.
      </p>
    ),
  },
  {
    title: "O/U Accuracy",
    content: (
      <p>
        % of over/under picks correct vs market total. Based on predicted total vs closing line.
      </p>
    ),
  },
];
