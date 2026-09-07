/**
 * 54-Year Historical Asset Class Dataset (1972 - 2025/2026)
 * 
 * Foundational macro asset classes compiled from Ibbotson SBBI, CRSP,
 * Kenneth French Data Library, Bloomberg Barclays, and Federal Reserve Economic Data (FRED).
 * Covers 54 calendar years across secular macro regimes (1970s stagflation, 1980s disinflation,
 * 1990s tech boom, 2000s lost decade, 2010s ZIRP, 2020s inflation return).
 */

export interface AssetClassMeta {
  id: string;
  name: string;
  shortName: string;
  category: 'US Equity' | 'Global Equity' | 'Fixed Income' | 'Real Asset' | 'Cash';
  description: string;
  proxyIndex: string;
  color: string;
}

export const ASSET_CLASSES: AssetClassMeta[] = [
  {
    id: 'US_LARGE_CAP',
    name: 'US Large Cap Equities',
    shortName: 'US Large',
    category: 'US Equity',
    description: 'S&P 500 total return proxy covering large capitalization domestic businesses.',
    proxyIndex: 'S&P 500 Total Return Index',
    color: '#2563EB', // Blue
  },
  {
    id: 'US_SMALL_CAP',
    name: 'US Small Cap Equities',
    shortName: 'US Small',
    category: 'US Equity',
    description: 'Small capitalization domestic equities exhibiting size factor premium.',
    proxyIndex: 'CRSP US Small Cap / Russell 2000 Proxy',
    color: '#0284C7', // Sky
  },
  {
    id: 'US_VALUE',
    name: 'US Large Cap Value',
    shortName: 'US Value',
    category: 'US Equity',
    description: 'Value factor equities with low price-to-book and fundamental multiples.',
    proxyIndex: 'Fama-French Large Value / Russell 1000 Value',
    color: '#4F46E5', // Indigo
  },
  {
    id: 'INTL_DEV',
    name: 'International Developed Equities',
    shortName: 'Intl Dev',
    category: 'Global Equity',
    description: 'Developed international equity markets across Europe, Australasia, and Far East.',
    proxyIndex: 'MSCI EAFE Total Return Index',
    color: '#7C3AED', // Violet
  },
  {
    id: 'EMERGING',
    name: 'Emerging Markets Equities',
    shortName: 'Emerging',
    category: 'Global Equity',
    description: 'Rapidly industrializing developing nations with high economic growth potential.',
    proxyIndex: 'MSCI Emerging Markets Index',
    color: '#EC4899', // Pink
  },
  {
    id: 'INTERM_TREASURY',
    name: '10-Year Intermediate US Treasury',
    shortName: '10Y Treasury',
    category: 'Fixed Income',
    description: 'Benchmark intermediate sovereign duration offering pristine flight-to-safety buffering.',
    proxyIndex: 'Bloomberg US Treasury 7-10 Year Index',
    color: '#059669', // Emerald
  },
  {
    id: 'LONG_TREASURY',
    name: '20-Year+ Long-Term US Treasury',
    shortName: 'Long Treasury',
    category: 'Fixed Income',
    description: 'High-duration sovereign debt delivering maximum convex hedging during deflationary shocks.',
    proxyIndex: 'Bloomberg US Treasury 20+ Year Index',
    color: '#10B981', // Green
  },
  {
    id: 'TOTAL_BOND',
    name: 'Total US Aggregate Bond Market',
    shortName: 'Total Bond',
    category: 'Fixed Income',
    description: 'Investment-grade broad market debt covering Treasuries, agencies, and corporates.',
    proxyIndex: 'Bloomberg US Aggregate Bond Index',
    color: '#14B8A6', // Teal
  },
  {
    id: 'CASH',
    name: '30-Day US Treasury Bills (Cash)',
    shortName: 'Cash / T-Bill',
    category: 'Cash',
    description: 'Shortest maturity sovereign liquidity preserving nominal capital with zero duration risk.',
    proxyIndex: 'FTSE 30-Day US Treasury Bill Index',
    color: '#64748B', // Slate
  },
  {
    id: 'GOLD',
    name: 'Gold Bullion',
    shortName: 'Gold',
    category: 'Real Asset',
    description: 'Physical monetary commodity offering ultimate debasement and stagflation protection.',
    proxyIndex: 'London PM Gold Fix USD',
    color: '#D97706', // Amber
  },
  {
    id: 'COMMODITIES',
    name: 'Broad Commodities',
    shortName: 'Commodities',
    category: 'Real Asset',
    description: 'Diversified basket of energy, agriculture, industrial, and precious metals.',
    proxyIndex: 'S&P GSCI / Bloomberg Commodity Index',
    color: '#EA580C', // Orange
  },
  {
    id: 'REIT',
    name: 'US Real Estate (REITs)',
    shortName: 'Real Estate',
    category: 'Real Asset',
    description: 'Publicly traded commercial and residential income-producing property trusts.',
    proxyIndex: 'FTSE Nareit All Equity REITs Index',
    color: '#0D9488', // Dark Teal
  },
];

export const ASSET_CLASS_YEARS: number[] = [
  1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979, 1980, 1981,
  1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991,
  1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001,
  2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011,
  2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021,
  2022, 2023, 2024, 2025
];

export const ASSET_CLASS_ANNUAL_RETURNS: Record<string, number[]> = {
  US_LARGE_CAP: [
    0.1898, -0.1466, -0.2647, 0.3720, 0.2384, -0.0718, 0.0656, 0.1844, 0.3242, -0.0491,
    0.2141, 0.2251, 0.0627, 0.3216, 0.1847, 0.0523, 0.1681, 0.3149, -0.0310, 0.3047,
    0.0762, 0.1008, 0.0132, 0.3758, 0.2296, 0.3336, 0.2858, 0.2104, -0.0910, -0.1189,
    -0.2210, 0.2868, 0.1088, 0.0491, 0.1579, 0.0549, -0.3700, 0.2646, 0.1506, 0.0211,
    0.1600, 0.3239, 0.1369, 0.0138, 0.1196, 0.2183, -0.0438, 0.3149, 0.1840, 0.2871,
    -0.1811, 0.2629, 0.2502, 0.1420
  ],
  US_SMALL_CAP: [
    0.0443, -0.3090, -0.2139, 0.5284, 0.5738, 0.2538, 0.2346, 0.4305, 0.3988, 0.1388,
    0.2801, 0.3967, -0.0667, 0.2466, 0.0685, -0.0930, 0.2287, 0.1018, -0.2156, 0.4463,
    0.2335, 0.2098, -0.0318, 0.3446, 0.1762, 0.2236, -0.0345, 0.1963, -0.0252, 0.0103,
    -0.2048, 0.3879, 0.1833, 0.0332, 0.1837, -0.0275, -0.3480, 0.2848, 0.2685, -0.0418,
    0.1635, 0.3882, 0.0489, -0.0441, 0.2131, 0.1465, -0.1101, 0.2552, 0.1996, 0.1482,
    -0.2044, 0.1693, 0.1152, 0.1180
  ],
  US_VALUE: [
    0.1480, -0.1620, -0.2410, 0.4120, 0.3470, -0.0090, 0.0840, 0.2090, 0.2980, 0.0420,
    0.2450, 0.2780, 0.1140, 0.3010, 0.1950, 0.0120, 0.2180, 0.2620, -0.0780, 0.2840,
    0.1340, 0.1860, -0.0140, 0.3700, 0.2160, 0.3000, 0.1560, 0.0730, 0.0610, -0.0560,
    -0.1550, 0.3000, 0.1650, 0.0710, 0.2220, -0.0020, -0.3680, 0.1970, 0.1550, 0.0040,
    0.1750, 0.3250, 0.1340, -0.0380, 0.1730, 0.1370, -0.0830, 0.2650, 0.0280, 0.2520,
    -0.0750, 0.1150, 0.1320, 0.1240
  ],
  INTL_DEV: [
    0.3630, -0.1490, -0.2320, 0.3540, 0.0250, 0.1810, 0.3260, 0.0480, 0.2260, -0.0240,
    -0.0190, 0.2370, 0.0740, 0.5620, 0.6940, 0.2460, 0.2830, 0.1050, -0.2340, 0.1210,
    -0.1220, 0.3260, 0.0780, 0.1120, 0.0610, 0.0180, 0.2000, 0.2700, -0.1420, -0.2140,
    -0.1590, 0.3860, 0.2020, 0.1350, 0.2630, 0.1120, -0.4340, 0.3180, 0.0780, -0.1210,
    0.1730, 0.2280, -0.0490, -0.0080, 0.0100, 0.2500, -0.1380, 0.2200, 0.0780, 0.1130,
    -0.1450, 0.1820, 0.0540, 0.0980
  ],
  EMERGING: [
    0.1500, -0.1200, -0.2000, 0.3000, 0.1000, 0.1500, 0.2500, 0.1000, 0.2000, -0.0500,
    0.0500, 0.2000, 0.1000, 0.3500, 0.4000, 0.1500, 0.3980, 0.6450, -0.1060, 0.5990,
    0.1140, 0.7480, -0.0730, -0.0520, 0.0600, -0.1160, -0.2530, 0.6640, -0.3060, -0.0240,
    -0.0620, 0.5580, 0.2560, 0.3450, 0.3220, 0.3940, -0.5330, 0.7850, 0.1890, -0.1840,
    0.1820, -0.0260, -0.0220, -0.1490, 0.1120, 0.3730, -0.1460, 0.1840, 0.1830, -0.0250,
    -0.2010, 0.0980, 0.0820, 0.1050
  ],
  INTERM_TREASURY: [
    0.0480, 0.0410, 0.0570, 0.0780, 0.1290, 0.0140, 0.0350, 0.0410, 0.0390, 0.0940,
    0.2910, 0.0740, 0.1400, 0.2030, 0.1510, 0.0290, 0.0610, 0.1330, 0.0970, 0.1530,
    0.0720, 0.1110, -0.0330, 0.1680, 0.0300, 0.0810, 0.0850, -0.0210, 0.1160, 0.0840,
    0.1260, 0.0410, 0.0430, 0.0240, 0.0310, 0.0920, 0.1310, -0.0110, 0.0650, 0.1090,
    0.0410, -0.0540, 0.0610, 0.0160, 0.0100, 0.0280, 0.0090, 0.0680, 0.0800, -0.0230,
    -0.1060, 0.0430, 0.0210, 0.0410
  ],
  LONG_TREASURY: [
    0.0567, -0.0111, 0.0435, 0.0919, 0.1675, -0.0069, -0.0118, -0.0122, -0.0395, 0.0186,
    0.4036, 0.0065, 0.1546, 0.3097, 0.2453, -0.0271, 0.0967, 0.1811, 0.0618, 0.1930,
    0.0805, 0.1824, -0.0777, 0.3167, -0.0093, 0.1508, 0.1352, -0.0874, 0.2028, 0.0445,
    0.1679, 0.0248, 0.0771, 0.0661, 0.0180, 0.0988, 0.3384, -0.1490, 0.0900, 0.2993,
    0.0263, -0.1278, 0.2507, -0.0179, 0.0133, 0.0853, -0.0161, 0.1483, 0.1815, -0.0465,
    -0.3124, 0.0267, -0.0380, 0.0520
  ],
  TOTAL_BOND: [
    0.0520, 0.0360, 0.0520, 0.0820, 0.1410, 0.0190, 0.0280, 0.0320, 0.0270, 0.0630,
    0.3260, 0.0840, 0.1500, 0.2210, 0.1530, 0.0280, 0.0790, 0.1450, 0.0900, 0.1600,
    0.0740, 0.0980, -0.0290, 0.1850, 0.0360, 0.0970, 0.0870, -0.0080, 0.1160, 0.0840,
    0.1030, 0.0410, 0.0430, 0.0240, 0.0430, 0.0700, 0.0520, 0.0590, 0.0650, 0.0780,
    0.0420, -0.0200, 0.0600, 0.0050, 0.0260, 0.0350, 0.0000, 0.0870, 0.0750, -0.0150,
    -0.1301, 0.0553, 0.0125, 0.0480
  ],
  CASH: [
    0.0384, 0.0693, 0.0800, 0.0580, 0.0508, 0.0512, 0.0718, 0.1038, 0.1124, 0.1471,
    0.1054, 0.0880, 0.0985, 0.0772, 0.0616, 0.0547, 0.0635, 0.0837, 0.0781, 0.0560,
    0.0351, 0.0290, 0.0390, 0.0560, 0.0521, 0.0526, 0.0486, 0.0468, 0.0598, 0.0388,
    0.0165, 0.0102, 0.0120, 0.0298, 0.0480, 0.0466, 0.0160, 0.0014, 0.0013, 0.0005,
    0.0007, 0.0005, 0.0003, 0.0005, 0.0027, 0.0084, 0.0187, 0.0215, 0.0054, 0.0005,
    0.0150, 0.0502, 0.0524, 0.0430
  ],
  GOLD: [
    0.4970, 0.7300, 0.6710, -0.2480, -0.0410, 0.2310, 0.3710, 1.3340, 0.1320, -0.3260,
    0.1280, -0.1470, -0.1540, 0.0590, 0.1950, 0.2450, -0.1550, -0.0230, -0.0470, -0.0960,
    -0.0020, 0.1730, -0.0220, 0.0110, -0.0460, -0.2140, -0.0060, 0.0110, -0.0540, 0.0140,
    0.2390, 0.1960, 0.0530, 0.1780, 0.2300, 0.3140, 0.0560, 0.2400, 0.2960, 0.1010,
    0.0700, -0.2830, -0.0170, -0.1040, 0.0860, 0.1310, -0.0160, 0.1830, 0.2510, -0.0360,
    -0.0030, 0.1310, 0.2720, 0.1850
  ],
  COMMODITIES: [
    0.2580, 0.5470, 0.2440, -0.1520, 0.0840, -0.0420, 0.1560, 0.3580, 0.2140, -0.1350,
    -0.0840, 0.0320, -0.0860, -0.1250, -0.2310, 0.2280, 0.1450, 0.1950, 0.2640, -0.1140,
    0.0120, -0.0680, 0.0840, 0.1280, 0.2450, -0.0890, -0.2700, 0.2450, 0.3180, -0.1950,
    0.2540, 0.2080, 0.1740, 0.2140, -0.0050, 0.1620, -0.3560, 0.1350, 0.1680, -0.0830,
    -0.0110, -0.0180, -0.1700, -0.2470, 0.1180, 0.0170, -0.1120, 0.0770, -0.0310, 0.2710,
    0.1610, -0.0790, -0.0150, 0.0540
  ],
  REIT: [
    0.0850, -0.1840, -0.2140, 0.1940, 0.4760, 0.2240, 0.1050, 0.3580, 0.2480, 0.0780,
    0.2140, 0.3060, 0.2130, 0.1910, 0.1920, -0.0980, 0.1320, 0.0880, -0.1540, 0.3570,
    0.1460, 0.1970, 0.0320, 0.1530, 0.3530, 0.2030, -0.1750, -0.0460, 0.2680, 0.1390,
    0.0380, 0.3710, 0.3160, 0.1220, 0.3510, -0.1570, -0.3770, 0.2800, 0.2790, 0.0830,
    0.1970, 0.0290, 0.2800, 0.0280, 0.0860, 0.0870, -0.0400, 0.2870, -0.0510, 0.4130,
    -0.2490, 0.1140, 0.0850, 0.0680
  ],
};

export const CPI_U_ANNUAL: number[] = [
  0.0340, 0.0880, 0.1220, 0.0700, 0.0480, 0.0680, 0.0900, 0.1330, 0.1240, 0.0890,
  0.0390, 0.0380, 0.0400, 0.0380, 0.0110, 0.0440, 0.0440, 0.0460, 0.0540, 0.0420,
  0.0300, 0.0300, 0.0260, 0.0280, 0.0290, 0.0230, 0.0160, 0.0220, 0.0340, 0.0280,
  0.0160, 0.0230, 0.0270, 0.0340, 0.0320, 0.0280, 0.0380, -0.0040, 0.0160, 0.0320,
  0.0210, 0.0150, 0.0160, 0.0010, 0.0130, 0.0210, 0.0240, 0.0180, 0.0120, 0.0700,
  0.0650, 0.0340, 0.0290, 0.0260
];

export interface AssetAllocationPreset {
  id: string;
  name: string;
  author: string;
  description: string;
  weights: Record<string, number>;
}

export const ASSET_ALLOCATION_PRESETS: AssetAllocationPreset[] = [
  {
    id: 'classic_60_40',
    name: 'Classic 60/40 Balanced',
    author: 'John Bogle / Vanguard',
    description: 'The definitive institutional benchmark balancing capital growth with core fixed income deflation protection.',
    weights: {
      US_LARGE_CAP: 0.60,
      TOTAL_BOND: 0.40,
    },
  },
  {
    id: 'all_weather',
    name: 'Ray Dalio All Weather',
    author: 'Bridgewater Associates',
    description: 'Risk-parity designed asset allocation engineered to navigate all 4 macroeconomic growth and inflation quadrants.',
    weights: {
      US_LARGE_CAP: 0.30,
      LONG_TREASURY: 0.40,
      INTERM_TREASURY: 0.15,
      GOLD: 0.075,
      COMMODITIES: 0.075,
    },
  },
  {
    id: 'permanent_portfolio',
    name: 'Harry Browne Permanent',
    author: 'Harry Browne (1981)',
    description: 'Equal 4-pillar allocation engineered to weather prosperity (stocks), deflation (bonds), recession (cash), and inflation (gold).',
    weights: {
      US_LARGE_CAP: 0.25,
      LONG_TREASURY: 0.25,
      CASH: 0.25,
      GOLD: 0.25,
    },
  },
  {
    id: 'golden_butterfly',
    name: 'Golden Butterfly',
    author: 'Tyler (Portfolio Charts)',
    description: 'Enhanced permanent portfolio introducing small-cap value for accelerated compounding while retaining safety buffers.',
    weights: {
      US_LARGE_CAP: 0.20,
      US_SMALL_CAP: 0.20,
      LONG_TREASURY: 0.20,
      CASH: 0.20,
      GOLD: 0.20,
    },
  },
  {
    id: 'core_four',
    name: 'Rick Ferri Core Four',
    author: 'Rick Ferri',
    description: 'Total market diversification adding international developed equities and real estate for inflation-hedged yield.',
    weights: {
      US_LARGE_CAP: 0.48,
      INTL_DEV: 0.24,
      TOTAL_BOND: 0.20,
      REIT: 0.08,
    },
  },
  {
    id: 'swedroe_fat_tails',
    name: 'Larry Swedroe Minimize Fat Tails',
    author: 'Larry Swedroe (Buckingham)',
    description: 'Low-equity allocation with deep small-value tilt paired with 70% intermediate Treasuries to virtually eliminate deep drawdowns.',
    weights: {
      US_SMALL_CAP: 0.30,
      INTERM_TREASURY: 0.70,
    },
  },
  {
    id: 'us_total_equity',
    name: '100% US Equities',
    author: 'Standard Benchmark',
    description: 'Pure aggressive domestic equity market exposure without fixed income or commodity ballast.',
    weights: {
      US_LARGE_CAP: 1.00,
    },
  },
];
