# Comprehensive Reference Feature Audit: Portfolio Visualizer

This audit provides an institutional-grade breakdown of the features, workflows, inputs, outputs, calculation methodologies, and operational constraints of **Portfolio Visualizer** (https://www.portfoliovisualizer.com/).

---

## 1. Portfolio Analysis

### 1.1 Backtest Portfolio (Ticker-Level)
* **Tool Name:** Backtest Portfolio
* **Purpose:** Evaluates the historical risk, return, and drawdown characteristics of user-defined multi-asset portfolios composed of mutual funds, ETFs, and individual stocks.
* **URL:** `https://www.portfoliovisualizer.com/backtest-portfolio`
* **Inputs:**
  * Initial Amount ($)
  * Time Period / Date Range (Month-to-Month or Year-to-Year)
  * Cash Flows (None, Contribute fixed amount, Withdraw fixed amount, Fixed percentage withdrawal)
  * Cash Flow Frequency (Monthly, Quarterly, Annually)
  * Contribution/Withdrawal Amount ($ or %)
  * Inflation Adjustment for Cash Flows (Yes/No, uses CPI-U)
  * Rebalancing Frequency (No rebalancing, Monthly, Quarterly, Semi-Annually, Annually, Rebalance bands/thresholds)
  * Rebalancing Bands (e.g., 5% absolute or 10% relative, Pro feature)
  * Leverage / Borrowing Rate (Pro feature: custom borrowing cost)
  * Benchmark (None, Default Vanguard 60/40, SPY, VTI, or custom ticker/portfolio)
  * Portfolio Assets & Weights: Ticker 1..N (up to 3 distinct portfolios simultaneously, e.g., Portfolio 1, Portfolio 2, Portfolio 3)
* **Input Defaults:**
  * Initial Amount: \$10,000
  * Rebalancing: Annually
  * Cash Flows: None
  * Benchmark: Vanguard 500 Index (VFINX/SPY)
  * Inflation: Adjusted for inflation (CPI-U)
  * Dividend Reinvestment: Yes (Total Return)
* **Dropdown Options:**
  * Time Period: Month-to-Month, Year-to-Year
  * Rebalance: None, Monthly, Quarterly, Semi-Annually, Annually, Dynamic/Threshold
  * Cash flows: None, Fixed Amount (Contribute), Fixed Amount (Withdraw), Fixed Percentage (Withdraw)
* **Constraints:**
  * Portfolio weight sum must equal 100.0% (warns or errors if not 100%)
  * Historical period bounded by the shortest asset inception date unless "Backfill with Asset Class" is enabled (paid feature).
  * Max 25 assets per portfolio in free tier; 50 in Pro.
* **Calculation Methodology:**
  * Returns: Total monthly return series $R_{p,t} = \sum w_{i,t-1} R_{i,t}$.
  * Rebalancing executes at end-of-period price after applying returns and periodic cash flows.
  * CAGR: $CAGR = \left(\frac{V_{\text{end}}}{V_{\text{start}}}\right)^{\frac{1}{n}} - 1$ (adjusted for net cash flows using money-weighted return / IRR or time-weighted return).
  * Volatility: Sample standard deviation of monthly returns annualized by $\sigma_{\text{ann}} = \sigma_{\text{monthly}} \times \sqrt{12}$.
  * Drawdown: Peak-to-trough decline $DD_t = \frac{V_t - \max_{s \le t} V_s}{\max_{s \le t} V_s}$.
  * Sharpe: $S = \frac{\text{CAGR} - R_f}{\sigma_{\text{ann}}}$ or mean excess monthly return annualized over annualized standard deviation.
  * Sortino: $\frac{R_p - R_f}{\sigma_d}$, where $\sigma_d = \sqrt{\frac{1}{T}\sum \min(R_t - \tau, 0)^2 \times 12}$.
* **Output Metrics:**
  * Starting Amount, Ending Balance, Total Return, CAGR, Annualized Standard Deviation
  * Best Year, Worst Year, Maximum Drawdown, Max Drawdown Duration (peak-to-recovery months)
  * Sharpe Ratio, Sortino Ratio, Calmar Ratio, Treynor Ratio
  * Market Correlation, Beta, Alpha (annualized Jensen's alpha), Tracking Error, Information Ratio
  * Upside Capture Ratio, Downside Capture Ratio, Safe Withdrawal Rate, Perpetual Withdrawal Rate
* **Tables:**
  * Summary Performance Metrics (Portfolios vs. Benchmark)
  * Annual Returns Table (Year-by-Year breakdown with asset contributions)
  * Monthly Returns Matrix (12-column grid Jan..Dec with Year Total)
  * Drawdown Periods (Top 5-10 worst drawdowns with Peak, Trough, Recovery Month, Depth)
  * Trailing Returns (YTD, 1M, 3M, 1Y, 3Y, 5Y, 10Y, Max)
  * Portfolio Holdings & Expense Ratio weighted summary
* **Charts:**
  * Portfolio Growth ($10,000 logarithmic and linear growth)
  * Underwater Drawdowns chart (percent drawdown over time)
  * Annual Returns Bar Chart
  * Monthly Heatmap
  * Rolling Returns (1-year, 3-year, 5-year rolling windows)
  * Rolling Volatility & Rolling Sharpe Ratio
  * Asset Allocation over time (drift chart if rebalance is infrequent)
* **Download/Export Options:** CSV export of monthly returns, annual returns, and drawdowns. PDF report generation (Basic/Pro).
* **Benchmark Capabilities:** Compare up to 3 portfolios against 1 designated benchmark (Market ETF or custom saved portfolio).
* **Rebalancing Options:** None, Monthly, Quarterly, Semi-Annually, Annually, Rebalancing Bands (Pro).
* **Cash-Flow Options:** Periodic contribution/withdrawal, annual inflation indexing, custom cash flows (Pro).
* **Date Settings:** Start year/month, End year/month; earliest available inception constraint auto-detected.
* **Inflation Adjustments:** CPI-U used to calculate Real (Inflation-Adjusted) CAGR and ending wealth.
* **Dividend Assumptions:** Reinvested at month-end; option to exclude dividend reinvestment (price return only).
* **Fees:** Asset expense ratios implicitly deducted from net asset value (NAV); optional custom annual advisory fee (bps).
* **Tax Assumptions:** Basic tool assumes tax-deferred account. Pro tool has basic capital gains drag toggle.
* **Mobile Behavior:** Collapses input fields into stacked form; tables horizontally scrollable.
* **Logged-in vs Logged-out:** Free users can backtest but cannot save portfolios or share permalinks with custom series; Pro unlocks CSV/PDF exports and saving >50 models.
* **Limitations/Paid-Only:** Free accounts limited in history depth (capped at recent decades for some tickers) and restricted from saving portfolios.

---

### 1.2 Backtest Asset Class Allocation
* **Tool Name:** Backtest Asset Class Allocation
* **Purpose:** Allows backtesting long-term asset allocation strategies dating back to 1972 using broad asset classes (e.g., US Large Cap, US Small Cap Value, International Developed, Emerging Markets, 10Y Treasury, Cash, Gold, REITs).
* **URL:** `https://www.portfoliovisualizer.com/backtest-asset-class-allocation`
* **Inputs:**
  * Starting Amount ($)
  * Start Year (default 1972) to End Year
  * Rebalancing Frequency (Annual, Semi-annual, Quarterly, Monthly)
  * Cash Flows ($ contributions/withdrawals, inflation-adjusted)
  * Asset Class Allocations (choose from ~40 synthetic asset classes, percentages sum to 100%)
* **Input Defaults:** Start Year 1972, End Year (latest complete year), Annual rebalancing, $10,000 starting.
* **Dropdown Options:** Asset classes categorized into US Equities, International Equities, Fixed Income, Real Assets (REIT, Commodities, Gold), and Cash Equivalents.
* **Constraints:** Sum of weights = 100%. Relies on compiled synthetic index series (Ibbotson, CRSP, Fama-French, Bloomberg Barclays).
* **Calculation Methodology:** Pure monthly or annual asset class total return compounding.
* **Output Metrics:** Same comprehensive suite as Backtest Portfolio (CAGR, StDev, Sharpe, Sortino, Max Drawdown, etc.).
* **Tables:** Annual returns, Asset correlation matrix for selected asset classes, Drawdown analysis.
* **Charts:** Historical growth curve (1972-present), Asset Class rolling return bars, Drawdown depth.
* **Download/Export Options:** CSV export of historical asset class returns.
* **Benchmark Capabilities:** Compare against US Stock Market, 60/40, or custom asset class blend.
* **Rebalancing Options:** Annual, Semi-Annual, Quarterly, Monthly, None.
* **Cash-Flow Options:** Standard accumulation / decumulation cash flow schedules.
* **Date Settings:** Annual granularity starting from 1972.
* **Inflation Adjustments:** Real return option using historical CPI data.
* **Dividend Assumptions:** Total return includes gross yield reinvestment.
* **Fees:** Net of historical index synthetic expenses (or 0 bps frictionless base).
* **Tax Assumptions:** None (gross returns).
* **Mobile Behavior:** Responsive form, large tables require panning.
* **Logged-in vs Logged-out:** Saving allocation templates requires login.
* **Limitations/Paid-Only:** Full multi-decade export requires Pro subscription.

---

### 1.3 Dynamic Allocation Backtesting
* **Tool Name:** Dynamic Allocation Backtesting
* **Purpose:** Backtests portfolios where target asset weights vary dynamically over time according to a defined schedule, glide path (age-based target date), or discrete historical phases.
* **URL:** `https://www.portfoliovisualizer.com/dynamic-allocation`
* **Inputs:**
  * Initial capital
  * Time periods with distinct target weights per interval (e.g., Phase 1: 1990-2000 80/20; Phase 2: 2000-2010 60/40; Phase 3: 2010+ 40/60)
  * Rebalancing within phases
* **Input Defaults:** Linear equity glide path reduction (1% equity decline per year).
* **Output Metrics:** Final wealth, Sequence of returns exposure, Realized volatility across lifecycle.
* **Limitations/Paid-Only:** Custom schedules with >3 phase breaks are Pro-only.

---

### 1.4 Manager Performance Analysis
* **Tool Name:** Manager Performance Analysis
* **Purpose:** Evaluates single manager or active fund performance against benchmark indices to isolate style factors, manager alpha, tracking error, and active risk.
* **URL:** `https://www.portfoliovisualizer.com/manager-performance`
* **Inputs:** Manager ticker / returns, Benchmark ticker / returns, Risk-free rate series, Lookback window.
* **Output Metrics:** Jensen's Alpha, Beta, Tracking Error, Information Ratio, Up-Market Capture, Down-Market Capture, Batting Average (% periods outperforming benchmark), Excess Return.
* **Charts:** Active return rolling chart, Capture ratio scatter plot, Rolling beta.

---

## 2. Portfolio Simulation

### 2.1 Monte Carlo Simulation
* **Tool Name:** Monte Carlo Simulation
* **Purpose:** Stress-tests portfolio longevity, wealth accumulation, and retirement decumulation across thousands of simulated market paths to quantify sequence of returns risk and ruin probability.
* **URL:** `https://www.portfoliovisualizer.com/monte-carlo-simulation`
* **Inputs:**
  * Portfolio Assets & Weights (or saved portfolio)
  * Initial Balance ($)
  * Time Horizon (Years, e.g., 20, 30, 40)
  * Number of Simulations (e.g., 1,000 to 10,000)
  * Simulation Model:
    1. Historical Returns (bootstrap sampling from actual past historical annual or monthly returns)
    2. Statistical Returns (parametric multivariate normal distribution based on historical mean, volatility, and correlation matrix)
    3. Parameterized Return Distribution (custom user-specified expected return and standard deviation per asset)
    4. Regime-switching / Fat-tailed (Student-t or block bootstrap)
  * Cash Flows:
    * Accumulation: Annual contribution ($), contribution growth rate (or inflation-indexed)
    * Retirement / Decumulation: Annual withdrawal ($ or % of initial balance or % of current balance)
    * Withdrawal Frequency: Annual, Monthly
    * Inflation adjustment for withdrawals: Constant real dollar vs. nominal dollar
  * Rebalancing frequency during simulation: Annual, None
* **Input Defaults:**
  * 10,000 simulations, 30-year horizon, $1,000,000 starting portfolio, $40,000 initial withdrawal (4% rule), Historical bootstrap.
* **Output Metrics:**
  * Success Rate / Probability of Survival (% of simulations with balance > $0 at end of horizon)
  * Probability of Ruin ($100\% - \text{Success Rate}$)
  * Median Ending Balance (50th percentile)
  * Ending Balance Percentiles: 5th, 10th, 25th, 50th, 75th, 90th, 95th
  * Safe Withdrawal Rate (maximum initial withdrawal % yielding $\ge 95\%$ success rate)
  * Perpetual Withdrawal Rate (initial withdrawal % preserving initial real purchasing power)
  * Max Drawdown distribution across simulations
* **Charts:**
  * Monte Carlo Fan Chart (Wealth trajectory percentiles over 1..N years)
  * Probability of Ruin curve over time
  * Ending Wealth Histogram / Density distribution
  * Withdrawal amount stability chart
* **Limitations/Paid-Only:** Custom block size bootstrap, advanced spending rules (Guyton-Klinger, floor/ceiling), and >10,000 paths require Pro.

---

### 2.2 Financial Goals & Asset/Liability Modeling
* **Tool Name:** Financial Goals
* **Purpose:** Models lifecycle financial milestones, integrating multi-stage cash flows (education, home purchase, retirement, pension, Social Security) to determine required savings rates and probability of milestone achievement.
* **URL:** `https://www.portfoliovisualizer.com/financial-goals`
* **Inputs:** Current age, Retirement age, End age, Current savings, Annual contribution, Outside income streams (Social Security age & amount, Defined benefit pension), One-off future liabilities/goals.
* **Outputs:** Goal funding probability, Shortfall analysis, Required savings rate adjustment.

---

## 3. Portfolio Optimization

### 3.1 Portfolio Optimization & Efficient Frontier
* **Tool Name:** Portfolio Optimization / Efficient Frontier
* **Purpose:** Solves for mathematically optimal asset weights across multiple objective functions and generates the Markowitz Modern Portfolio Theory (MPT) Efficient Frontier curve.
* **URL:** `https://www.portfoliovisualizer.com/optimize-portfolio` and `https://www.portfoliovisualizer.com/efficient-frontier`
* **Inputs:**
  * Asset list (tickers or asset classes)
  * Objective Function:
    1. Maximize Sharpe Ratio (Tangency portfolio)
    2. Minimize Variance (Global Minimum Variance portfolio)
    3. Maximize Return for Target Volatility
    4. Minimize Volatility for Target Return
    5. Maximize Sortino Ratio
    6. Maximize Diversification Ratio (Choueifaty)
    7. Equal Risk Contribution (Risk Parity)
    8. Minimize Conditional Value-at-Risk (CVaR / Expected Shortfall at 95% confidence)
    9. Kelly Criterion (growth-rate optimal)
  * Historical Time Horizon for covariance/return estimation (e.g., last 3Y, 5Y, 10Y, or custom)
  * Return Assumptions: Historical average, CAPM equilibrium, or User-specified expected returns
  * Constraints:
    * Long-only ($w_i \ge 0$) vs. Allow Short Selling
    * Min weight per asset ($w_i \ge w_{\min}$)
    * Max weight per asset ($w_i \le w_{\max}$)
    * Asset Group constraints (e.g., Equity group sum $\le 60\%$)
    * Maximum number of active holdings
* **Calculation Methodology:**
  * Quadratic Programming (QP) solver: $\min \frac{1}{2} w^T \Sigma w - \lambda w^T \mu$ subject to $A w \le b$ and $\sum w_i = 1$.
  * Efficient Frontier traced by sweeping expected return target $\mu_{\text{target}}$ from $\mu_{\text{min\_var}}$ to $\max(\mu_i)$.
* **Output Metrics:**
  * Optimal weights table ($w_1^*, \dots, w_n^*$)
  * Expected Return, Expected Annual Volatility, Sharpe Ratio
  * Asset contribution to risk table
* **Charts:**
  * Interactive Efficient Frontier Curve (Risk $\sigma$ on X-axis, Return $\mu$ on Y-axis)
  * Individual assets plotted in risk/return space
  * Current portfolio marker vs. Tangency (Max Sharpe) marker vs. Min Variance marker
  * Optimal Allocation Stacked Bar Chart across the frontier

---

### 3.2 Risk Parity
* **Tool Name:** Risk Parity / Equal Risk Contribution (ERC)
* **Purpose:** Allocates capital such that every asset contributes equally to the total portfolio volatility risk, preventing dominant equity risk concentration.
* **URL:** `https://www.portfoliovisualizer.com/risk-parity`
* **Methodology:**
  * Marginal Contribution to Risk: $MCR_i = \frac{(\Sigma w)_i}{\sigma_p}$
  * Absolute Risk Contribution: $RC_i = w_i \times MCR_i = \frac{w_i (\Sigma w)_i}{\sigma_p}$
  * Percentage Risk Contribution: $\%RC_i = \frac{RC_i}{\sigma_p} = \frac{w_i (\Sigma w)_i}{w^T \Sigma w}$
  * Equal Risk Parity condition: $\%RC_i = \frac{1}{N} \quad \forall i$.
  * Solved using cyclical coordinate descent or non-linear optimization with log-barrier formulation: $\min \frac{1}{2} w^T \Sigma w - c \sum \ln(w_i)$.
* **Outputs:** Weight column, Asset Volatility, Marginal Risk Contribution, Total Risk Contribution, % of Total Risk.

---

### 3.3 Black-Litterman Model
* **Tool Name:** Black-Litterman Model
* **Purpose:** Combines market equilibrium returns (reverse-engineered from market capitalization weights) with subjective investor views to generate stable posterior return distributions without extreme corner solutions.
* **URL:** `https://www.portfoliovisualizer.com/black-litterman-model`
* **Equations & Methodology:**
  * Market Equilibrium: $\Pi = \delta \Sigma w_{\text{mkt}}$, where $\delta = \frac{E(R_{\text{mkt}}) - R_f}{\sigma_{\text{mkt}}^2}$.
  * Views: $P \cdot E(R) = Q + \epsilon$, with view error covariance $\Omega$.
  * Posterior Expected Return:
    $$E(R) = \left[(\tau \Sigma)^{-1} + P^T \Omega^{-1} P\right]^{-1} \left[(\tau \Sigma)^{-1} \Pi + P^T \Omega^{-1} Q\right]$$
  * Posterior Covariance:
    $$M = \Sigma + \left[(\tau \Sigma)^{-1} + P^T \Omega^{-1} P\right]^{-1}$$
* **Inputs:** Asset universe, Market cap weights, Risk aversion $\delta$, Scaling parameter $\tau$, Absolute views (e.g., Asset A will return 8%), Relative views (e.g., Asset A will outperform Asset B by 2%), View confidence levels (determining diagonal of $\Omega$).
* **Outputs:** Implied Equilibrium Returns vs. Investor Views vs. Posterior Returns; Recommended optimal portfolio weights.

---

### 3.4 Rolling Optimization
* **Tool Name:** Rolling Optimization
* **Purpose:** Assesses the out-of-sample stability of optimization techniques by recalculating optimal weights over rolling lookback windows (e.g., 36 months) and evaluating out-of-sample walking forward returns.
* **URL:** `https://www.portfoliovisualizer.com/rolling-optimization`

---

## 4. Asset Analytics

### 4.1 Asset Correlations & Rolling Correlation
* **Tool Name:** Asset Correlations
* **Purpose:** Calculates pairwise Pearson correlation coefficients, covariance matrices, and rolling correlation time-series across an arbitrary set of tickers or asset classes.
* **URL:** `https://www.portfoliovisualizer.com/asset-correlations`
* **Inputs:** List of tickers (up to 25/50), Time period, Return frequency (Daily, Weekly, Monthly), Rolling window size (e.g., 20, 60, 120, 252 days or 24, 36 months).
* **Outputs:**
  * Pairwise Correlation Matrix table
  * Correlation Heatmap (color gradient green +1.0 to red -1.0)
  * Rolling Correlation Line Chart over time
  * Cross-sectional correlation distribution

---

### 4.2 Asset Autocorrelation & Cointegration
* **Tool Name:** Asset Autocorrelation & Cointegration
* **Purpose:** Identifies serial momentum / mean-reversion via autocorrelation lags, and tests long-term price convergence (pairs trading) using the Augmented Dickey-Fuller (ADF) cointegration test.
* **URL:** `https://www.portfoliovisualizer.com/asset-autocorrelation` and `https://www.portfoliovisualizer.com/asset-cointegration`
* **Outputs:** Autocorrelation coefficients at lag 1..12; ADF test statistic, p-value, critical values (1%, 5%, 10%), hedge ratio $\beta$.

---

### 4.3 Fund Screener & Fund Performance
* **Tool Name:** Fund Screener / Fund Performance
* **Purpose:** Screens universe of ETFs and mutual funds based on asset class, category, expense ratio, trailing returns, Sharpe ratio, and factor exposures.
* **URL:** `https://www.portfoliovisualizer.com/fund-screener`

---

## 5. Factor Analysis

### 5.1 Factor Regression (Asset & Portfolio)
* **Tool Name:** Factor Analysis
* **Purpose:** Performs multi-factor Ordinary Least Squares (OLS) regressions of security or portfolio returns against systematic academic risk factors to quantify manager skill (Alpha) and factor exposures (Beta).
* **URL:** `https://www.portfoliovisualizer.com/factor-analysis`
* **Supported Models:**
  1. CAPM ($R_i - R_f = \alpha + \beta_{MKT} (R_m - R_f) + \epsilon$)
  2. Fama-French 3-Factor (Market, SMB [Size], HML [Value])
  3. Carhart 4-Factor (Market, SMB, HML, MOM [Momentum])
  4. Fama-French 5-Factor (Market, SMB, HML, RMW [Profitability], CMA [Investment])
  5. AQR Factor Models (Quality Minus Junk, etc.)
* **Inputs:** Ticker or Portfolio weights, Factor model selector, Time period, Data frequency (Monthly).
* **Outputs:**
  * Alpha ($\alpha$, annualized and monthly), Factor Loadings ($\beta_k$), Standard Errors, t-statistics, p-values ($P > |t|$)
  * R-squared ($R^2$) and Adjusted $R^2$
  * Residual Standard Deviation
  * Rolling Factor Loadings Chart (e.g., 36-month rolling beta to SMB, HML)
  * Factor Performance Attribution table (breaking active return into factor contributions)

---

### 5.2 Risk Factor Allocation & Factor Exposure Matching
* **Tool Name:** Risk Factor Allocation
* **Purpose:** Reverse-solves portfolio weights to match a target set of factor exposures (e.g., target Market Beta = 1.0, Value Beta = 0.3, Size Beta = 0.2).
* **URL:** `https://www.portfoliovisualizer.com/risk-factor-allocation`

---

### 5.3 Principal Component Analysis (PCA)
* **Tool Name:** Principal Component Analysis
* **Purpose:** Deconstructs the covariance matrix of a portfolio's assets into orthogonal principal components, identifying the underlying statistical drivers explaining systemic variance.
* **Outputs:** Scree plot (variance explained per eigenvalue), Component loadings heatmap.

---

## 6. Tactical Asset Allocation (TAA)

### 6.1 Tactical Models Suite
* **Tool Name:** Tactical Asset Allocation Models
* **Purpose:** Backtests rules-based market timing and rotational momentum strategies across an asset universe with explicit cash/hedging rules.
* **URL:** `https://www.portfoliovisualizer.com/tactical-asset-allocation-model`
* **Supported Strategies:**
  1. **Moving Average (Trend Following):**
     * Single asset: Price > SMA (e.g., 10-month or 200-day) $\to$ Hold Asset; else Hold Cash.
     * Dual MA Crossover: Faster SMA (e.g., 50-day) > Slower SMA (e.g., 200-day) $\to$ Risk-On; else Risk-Off.
  2. **Relative Strength / Momentum Rotation:**
     * Ranks universe of $N$ assets by lookback return (e.g., 1M, 3M, 6M, 12M or weighted average).
     * Invests in Top $K$ assets, weighted equally or by inverse volatility.
  3. **Dual Momentum (Gary Antonacci):**
     * Relative Momentum: Ranks risky assets against one another.
     * Absolute Momentum: Verifies if top asset return exceeds risk-free hurdle rate (e.g., BIL or 12M Treasury). If negative, allocates to cash or aggregate bond (BND/AGG).
  4. **Adaptive Allocation:**
     * Combines relative momentum screening with dynamically optimized portfolio weights (Minimum Variance or Risk Parity) calculated on selected subset.
  5. **Target Volatility:**
     * Dynamically scales portfolio leverage or cash proportion: $w_{\text{risky}} = \min\left(\frac{\sigma_{\text{target}}}{\sigma_{\text{realized}}}, \text{Max Leverage}\right)$.
  6. **Market Valuation Models:**
     * Valuation-informed allocation using Shiller PE (CAPE ratio) thresholds.
* **Inputs:** Universe of tickers, Out-of-market safety asset (Cash, SHV, BIL, AGG), Lookback window (months/days), Rebalance frequency, Number of holdings $K$, Execution delay (0 or 1 period).
* **Outputs:** Strategy CAGR vs. Benchmark Buy-and-Hold, Max Drawdown, Annual Turnover %, Trade Log / Allocation History table.

---

## 7. Platform-Wide Architecture & Operational Realities

### 7.1 Cross-Cutting Analysis
| Dimension | Portfolio Visualizer Baseline | Our Required Standard |
| :--- | :--- | :--- |
| **Data Licensing** | Uses proprietary index compilations; limited free access | Multi-provider abstraction layer (Stooq, Yahoo Finance, Alpha Vantage, Polygon, SEC EDGAR) + curated local benchmark repository |
| **Look-Ahead Bias** | End-of-month decision uses month-end closing price, trades executed concurrently | Strict separation: signals computed on $T$, execution simulated at $T$ close or $T+1$ open |
| **Leveraged ETFs** | Treats leveraged ETFs based on actual historical prices; no synthetic pre-inception compounding | Explicit distinction: actual price history default; optional mathematical model with daily compounding, borrow expense, and volatility drag clearly labeled |
| **Missing History** | Default truncates analysis to common inception date; offers paid backfill | Clear banner warning of common inception date; explicit visual timeline of asset histories; optional proxy backfill |
| **Pricing Tiering** | Paywalled exports, saving models, and extended history | Open core quantitative architecture; unlimited local saved portfolios, high-fidelity CSV/JSON export |
| **AI Assistant** | None | Embedded AI Portfolio Analyst reading strict quantitative engine outputs |

---
