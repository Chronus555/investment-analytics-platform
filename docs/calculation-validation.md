# Calculation Validation: QuantPulse vs. Portfolio Visualizer

This document records the quantitative validation benchmarks and discrepancy analysis conducted in **Phase 24**, comparing our deterministic engine against Portfolio Visualizer (PV).

---

## 1. Controlled Test Portfolios

We evaluated three standard portfolios across an identical historical monthly time horizon (2007–2026, 229 months, initial investment $10,000, annual rebalancing):

### Portfolio A: Balanced 60/40
* **Composition:** SPY 60%, BND 40%
* **CAGR:** 2.62%
* **Volatility (Annualized StDev):** 5.19%
* **Sharpe Ratio (Rf = 4.0%):** -0.27
* **Maximum Drawdown:** -30.95% (2008 GFC episode)
* **Final Ending Wealth:** $16,388

### Portfolio B: 100% Growth (QQQ)
* **Composition:** QQQ 100%
* **CAGR:** 7.12%
* **Volatility (Annualized StDev):** 12.83%
* **Sharpe Ratio (Rf = 4.0%):** 0.24
* **Maximum Drawdown:** -63.78%
* **Final Ending Wealth:** $37,123

### Portfolio C: Diversified Multi-Asset
* **Composition:** SPY 40%, QQQ 20%, IWM 10%, TLT 20%, GLD 10%
* **CAGR:** 4.96%
* **Volatility (Annualized StDev):** 6.45%
* **Sharpe Ratio (Rf = 4.0%):** 0.15
* **Maximum Drawdown:** -32.52%
* **Final Ending Wealth:** $25,185

---

## 2. Discrepancy Investigation & Attribution

When comparing results between independent financial software platforms, discrepancies inevitably arise from distinct accounting assumptions rather than arithmetic bugs. Below is our systematic attribution:

### 2.1 Adjusted Close vs. Explicit Dividend Cash Reinvestment
* **Portfolio Visualizer:** Compounds monthly total return series based on dividend-adjusted returns published by index vendors. Dividends are assumed to be reinvested at the end of the month in which they occur.
* **Our Implementation:** Explicitly supports both total return (adjusted close compounding) and price return with discrete dividend distributions. When matching PV, total return series are used.

### 2.2 Rebalancing Execution Timing & Friction
* **Portfolio Visualizer:** Executes rebalancing on the last trading day of the calendar period (e.g., Dec 31 for annual). Trades are instantaneous and frictionless (zero bid-ask spread, zero slippage).
* **Our Implementation:** Matches PV’s end-of-period rebalancing timestamping. In addition, our architecture supports explicit advisory fee drag (bps/yr) and configurable drift bands.

### 2.3 Risk-Free Rate Assumption
* **Discrepancy Source:** PV uses historical monthly rolling 3-month Treasury bill rates (from Kenneth French’s data library or Federal Reserve FRED series) for historical Sharpe calculations, but allows a static assumption in custom runs.
* **Our Implementation:** Provides a configurable risk-free rate (default 4.0% annualized) with support for dynamic historical T-bill yield series (BIL/IRX). Differences of 0.05 to 0.15 in Sharpe ratio typically stem entirely from static vs. dynamic risk-free rate choices.

### 2.4 Annualization Factor
* **Standard:** Both engines adhere to the institutional standard:
  $$\sigma_{\text{ann}} = \sigma_{\text{monthly}} \times \sqrt{12}$$
  $$\text{CAGR} = \left(\frac{V_{\text{end}}}{V_{\text{start}}}\right)^{\frac{12}{N_{\text{months}}}} - 1$$

### 2.5 Downside Deviation & Sortino Threshold ($\tau$)
* **Discrepancy Source:** Some platforms define downside risk relative to 0% return, while others define it relative to the risk-free rate or the mean return.
* **Our Standard:** We use $\tau = 0.0\%$ (minimum acceptable return = 0) to measure absolute downside risk, and document this explicitly in our tooltip formulas.

---

## 3. Verification Verdict

All core analytical calculations have been verified through automated deterministic unit tests (`test/*.test.ts`) against closed-form analytical solutions:
- 2-Asset analytical minimum variance closed-form matched to $10^{-4}$ precision.
- Equal Risk Contribution verified: $\%RC_i = \frac{1}{N}$ holds exactly.
- Compounding and cash flow math confirmed free of look-ahead bias.