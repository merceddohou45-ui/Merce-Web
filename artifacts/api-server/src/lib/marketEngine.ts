import { logger } from "./logger";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Timeframe = "M1" | "M5" | "M15" | "H1" | "H4";

export interface MarketSignal {
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  timeframe: string;
  confidence: number;
  riskPercent: number;
  reason: string;
  generatedAt: string;
}

export interface AssetInfo {
  symbol: string;
  name: string;
  type: string;
  category: string;
  spread: number;
  pip: number;
}

const BROKER_ASSETS: Record<string, AssetInfo[]> = {
  binance: [
    { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
    { symbol: "ETHUSDT", name: "Ethereum / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
    { symbol: "BNBUSDT", name: "BNB / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
    { symbol: "SOLUSDT", name: "Solana / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.001 },
    { symbol: "XRPUSDT", name: "Ripple / Tether", type: "crypto", category: "Crypto", spread: 0.0001, pip: 0.0001 },
    { symbol: "ADAUSDT", name: "Cardano / Tether", type: "crypto", category: "Crypto", spread: 0.0001, pip: 0.0001 },
    { symbol: "DOGEUSDT", name: "Dogecoin / Tether", type: "crypto", category: "Crypto", spread: 0.00001, pip: 0.00001 },
    { symbol: "AVAXUSDT", name: "Avalanche / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
  ],
  bybit: [
    { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", category: "Crypto", spread: 0.5, pip: 0.01 },
    { symbol: "ETHUSDT", name: "Ethereum / Tether", type: "crypto", category: "Crypto", spread: 0.1, pip: 0.01 },
    { symbol: "SOLUSDT", name: "Solana / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.001 },
    { symbol: "XRPUSDT", name: "Ripple / Tether", type: "crypto", category: "Crypto", spread: 0.0001, pip: 0.0001 },
    { symbol: "LINKUSDT", name: "Chainlink / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.001 },
  ],
  exness: [
    { symbol: "XAUUSD", name: "Gold / US Dollar", type: "commodities", category: "Metals", spread: 0.1, pip: 0.01 },
    { symbol: "EURUSD", name: "Euro / US Dollar", type: "forex", category: "Major Pairs", spread: 0.1, pip: 0.0001 },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", type: "forex", category: "Major Pairs", spread: 0.3, pip: 0.01 },
    { symbol: "USDCHF", name: "US Dollar / Swiss Franc", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", type: "forex", category: "Major Pairs", spread: 0.3, pip: 0.0001 },
    { symbol: "US30", name: "Dow Jones Industrial Average", type: "indices", category: "Indices", spread: 1.0, pip: 1 },
    { symbol: "NAS100", name: "NASDAQ 100", type: "indices", category: "Indices", spread: 1.0, pip: 0.1 },
    { symbol: "XAGUSD", name: "Silver / US Dollar", type: "commodities", category: "Metals", spread: 0.02, pip: 0.001 },
    { symbol: "USOIL", name: "US Crude Oil", type: "commodities", category: "Energy", spread: 0.03, pip: 0.01 },
  ],
  metatrader: [
    { symbol: "EURUSD", name: "Euro / US Dollar", type: "forex", category: "Major Pairs", spread: 0.1, pip: 0.0001 },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", type: "forex", category: "Major Pairs", spread: 0.3, pip: 0.01 },
    { symbol: "XAUUSD", name: "Gold / US Dollar", type: "commodities", category: "Metals", spread: 0.15, pip: 0.01 },
    { symbol: "USDCHF", name: "US Dollar / Swiss Franc", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "EURGBP", name: "Euro / British Pound", type: "forex", category: "Cross Pairs", spread: 0.3, pip: 0.0001 },
    { symbol: "US30", name: "Dow Jones Industrial Average", type: "indices", category: "Indices", spread: 1.5, pip: 1 },
    { symbol: "NAS100", name: "NASDAQ 100", type: "indices", category: "Indices", spread: 1.2, pip: 0.1 },
    { symbol: "SP500", name: "S&P 500", type: "indices", category: "Indices", spread: 0.8, pip: 0.1 },
  ],
  default: [
    { symbol: "EURUSD", name: "Euro / US Dollar", type: "forex", category: "Major Pairs", spread: 0.2, pip: 0.0001 },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", type: "forex", category: "Major Pairs", spread: 0.3, pip: 0.0001 },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", type: "forex", category: "Major Pairs", spread: 0.3, pip: 0.01 },
    { symbol: "XAUUSD", name: "Gold / US Dollar", type: "commodities", category: "Metals", spread: 0.2, pip: 0.01 },
    { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", category: "Crypto", spread: 1.0, pip: 0.01 },
    { symbol: "US30", name: "Dow Jones Industrial Average", type: "indices", category: "Indices", spread: 1.5, pip: 1 },
    { symbol: "NAS100", name: "NASDAQ 100", type: "indices", category: "Indices", spread: 1.5, pip: 0.1 },
  ],
};

const SIGNAL_REASONS = [
  "Strong bullish momentum with RSI divergence above 50",
  "EMA crossover confirmed on higher timeframe, trend continuation",
  "Price broke key resistance with high volume confirmation",
  "Support zone respected, bounce pattern detected",
  "Fibonacci retracement at 61.8% with bullish engulfing candle",
  "MACD bullish crossover with positive histogram",
  "Double bottom formation confirmed at key support",
  "Head and shoulders breakout with volume spike",
  "Bearish engulfing at strong resistance zone",
  "Overbought RSI (>75) with bearish divergence signal",
  "Trend line break with momentum confirmation",
  "Bearish MACD crossover, downtrend continuation expected",
  "Key resistance rejected twice, short opportunity",
  "Oversold bounce signal with hammer candlestick pattern",
];

function getAssetsForBroker(broker: string): AssetInfo[] {
  const key = broker.toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("binance")) return BROKER_ASSETS.binance;
  if (key.includes("bybit")) return BROKER_ASSETS.bybit;
  if (key.includes("exness")) return BROKER_ASSETS.exness;
  if (key.includes("meta") || key.includes("mt4") || key.includes("mt5")) return BROKER_ASSETS.metatrader;
  return BROKER_ASSETS.default;
}

function generateSignalForAsset(
  asset: AssetInfo,
  riskLevel: RiskLevel,
  timeframe: string
): MarketSignal | null {
  const rand = Math.random();

  const confidenceRanges: Record<RiskLevel, [number, number]> = {
    LOW: [82, 95],
    MEDIUM: [70, 92],
    HIGH: [60, 88],
  };

  const signalFrequency: Record<RiskLevel, number> = {
    LOW: 0.3,
    MEDIUM: 0.5,
    HIGH: 0.7,
  };

  if (rand > signalFrequency[riskLevel]) return null;

  const [minConf, maxConf] = confidenceRanges[riskLevel];
  const confidence = Math.floor(Math.random() * (maxConf - minConf) + minConf);

  const direction = Math.random() > 0.5 ? "BUY" : "SELL";

  // Generate realistic price levels based on asset type
  const basePrices: Record<string, number> = {
    XAUUSD: 2340 + (Math.random() - 0.5) * 40,
    BTCUSDT: 67000 + (Math.random() - 0.5) * 3000,
    ETHUSDT: 3500 + (Math.random() - 0.5) * 300,
    EURUSD: 1.08 + (Math.random() - 0.5) * 0.02,
    GBPUSD: 1.27 + (Math.random() - 0.5) * 0.02,
    USDJPY: 151 + (Math.random() - 0.5) * 3,
    USDCHF: 0.904 + (Math.random() - 0.5) * 0.01,
    AUDUSD: 0.655 + (Math.random() - 0.5) * 0.01,
    USDCAD: 1.36 + (Math.random() - 0.5) * 0.02,
    EURGBP: 0.856 + (Math.random() - 0.5) * 0.01,
    US30: 39500 + (Math.random() - 0.5) * 500,
    NAS100: 18000 + (Math.random() - 0.5) * 400,
    SP500: 5200 + (Math.random() - 0.5) * 100,
    SOLUSDT: 170 + (Math.random() - 0.5) * 20,
    XRPUSDT: 0.52 + (Math.random() - 0.5) * 0.05,
    BNBUSDT: 600 + (Math.random() - 0.5) * 30,
    LINKUSDT: 14 + (Math.random() - 0.5) * 2,
    ADAUSDT: 0.45 + (Math.random() - 0.5) * 0.05,
    DOGEUSDT: 0.15 + (Math.random() - 0.5) * 0.02,
    AVAXUSDT: 38 + (Math.random() - 0.5) * 4,
    XAGUSD: 29 + (Math.random() - 0.5) * 2,
    USOIL: 82 + (Math.random() - 0.5) * 3,
  };

  const entry = basePrices[asset.symbol] ?? (100 + Math.random() * 50);

  const riskMultipliers: Record<RiskLevel, number> = {
    LOW: 0.008,
    MEDIUM: 0.012,
    HIGH: 0.018,
  };
  const riskMult = riskMultipliers[riskLevel];

  const slDistance = entry * riskMult;
  const tp1Distance = slDistance * 1.5;
  const tp2Distance = slDistance * 2.5;
  const tp3Distance = slDistance * 4;

  const stopLoss = direction === "BUY" ? entry - slDistance : entry + slDistance;
  const takeProfit1 = direction === "BUY" ? entry + tp1Distance : entry - tp1Distance;
  const takeProfit2 = direction === "BUY" ? entry + tp2Distance : entry - tp2Distance;
  const takeProfit3 = direction === "BUY" ? entry + tp3Distance : entry - tp3Distance;

  const riskPercents: Record<RiskLevel, number> = {
    LOW: 0.5 + Math.random() * 0.5,
    MEDIUM: 1 + Math.random() * 1,
    HIGH: 1.5 + Math.random() * 1.5,
  };

  const reason = SIGNAL_REASONS[Math.floor(Math.random() * SIGNAL_REASONS.length)];

  const decimals = asset.pip < 0.001 ? 8 : asset.pip < 0.01 ? 5 : asset.pip < 0.1 ? 4 : asset.pip < 1 ? 2 : 0;
  const round = (n: number) => parseFloat(n.toFixed(decimals));

  return {
    symbol: asset.symbol,
    direction,
    entry: round(entry),
    stopLoss: round(stopLoss),
    takeProfit1: round(takeProfit1),
    takeProfit2: round(takeProfit2),
    takeProfit3: round(takeProfit3),
    timeframe,
    confidence,
    riskPercent: parseFloat(riskPercents[riskLevel].toFixed(2)),
    reason,
    generatedAt: new Date().toISOString(),
  };
}

export function getBrokerAssets(broker: string): AssetInfo[] {
  return getAssetsForBroker(broker);
}

export function generateSignals(
  broker: string,
  riskLevel: RiskLevel = "MEDIUM",
  timeframe: string = "M5"
): MarketSignal[] {
  const assets = getAssetsForBroker(broker);
  const signals: MarketSignal[] = [];

  for (const asset of assets) {
    const signal = generateSignalForAsset(asset, riskLevel, timeframe);
    if (signal) signals.push(signal);
  }

  logger.info({ broker, count: signals.length }, "Generated market signals");
  return signals;
}
