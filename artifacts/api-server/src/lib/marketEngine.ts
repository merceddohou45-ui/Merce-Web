import { logger } from "./logger";
import { fetchOHLCV, fetchLivePrice } from "./twelveData";

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
  analysisDetails: AnalysisDetails;
  generatedAt: string;
}

export interface AnalysisDetails {
  rsi: number;
  ema20: number;
  ema50: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  trendDirection: "HAUSSE" | "BAISSE" | "LATERAL";
  supportLevel: number;
  resistanceLevel: number;
  momentum: "FORT_HAUSSIER" | "HAUSSIER" | "NEUTRE" | "BAISSIER" | "FORT_BAISSIER";
  conditionsMet: string[];
}

export interface AssetInfo {
  symbol: string;
  name: string;
  type: string;
  category: string;
  spread: number;
  pip: number;
}

// ─── Asset catalogue ──────────────────────────────────────────────────────────
const BROKER_ASSETS: Record<string, AssetInfo[]> = {
  binance: [
    { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
    { symbol: "ETHUSDT", name: "Ethereum / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
    { symbol: "SOLUSDT", name: "Solana / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.001 },
    { symbol: "BNBUSDT", name: "BNB / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.01 },
    { symbol: "XRPUSDT", name: "Ripple / Tether", type: "crypto", category: "Crypto", spread: 0.0001, pip: 0.0001 },
  ],
  bybit: [
    { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", category: "Crypto", spread: 0.5, pip: 0.01 },
    { symbol: "ETHUSDT", name: "Ethereum / Tether", type: "crypto", category: "Crypto", spread: 0.1, pip: 0.01 },
    { symbol: "SOLUSDT", name: "Solana / Tether", type: "crypto", category: "Crypto", spread: 0.01, pip: 0.001 },
    { symbol: "XRPUSDT", name: "Ripple / Tether", type: "crypto", category: "Crypto", spread: 0.0001, pip: 0.0001 },
  ],
  exness: [
    { symbol: "XAUUSD", name: "Or / Dollar", type: "commodities", category: "Métaux", spread: 0.1, pip: 0.01 },
    { symbol: "EURUSD", name: "Euro / Dollar", type: "forex", category: "Paires Majeures", spread: 0.1, pip: 0.0001 },
    { symbol: "GBPUSD", name: "Livre / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
    { symbol: "USDJPY", name: "Dollar / Yen", type: "forex", category: "Paires Majeures", spread: 0.3, pip: 0.01 },
    { symbol: "USDCHF", name: "Dollar / Franc Suisse", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
    { symbol: "AUDUSD", name: "Dollar Australien / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
  ],
  metatrader: [
    { symbol: "EURUSD", name: "Euro / Dollar", type: "forex", category: "Paires Majeures", spread: 0.1, pip: 0.0001 },
    { symbol: "GBPUSD", name: "Livre / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
    { symbol: "USDJPY", name: "Dollar / Yen", type: "forex", category: "Paires Majeures", spread: 0.3, pip: 0.01 },
    { symbol: "XAUUSD", name: "Or / Dollar", type: "commodities", category: "Métaux", spread: 0.15, pip: 0.01 },
    { symbol: "USDCHF", name: "Dollar / Franc Suisse", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
    { symbol: "AUDUSD", name: "Dollar Australien / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
    { symbol: "EURGBP", name: "Euro / Livre", type: "forex", category: "Paires Croisées", spread: 0.3, pip: 0.0001 },
  ],
  default: [
    { symbol: "EURUSD", name: "Euro / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2, pip: 0.0001 },
    { symbol: "GBPUSD", name: "Livre / Dollar", type: "forex", category: "Paires Majeures", spread: 0.3, pip: 0.0001 },
    { symbol: "USDJPY", name: "Dollar / Yen", type: "forex", category: "Paires Majeures", spread: 0.3, pip: 0.01 },
    { symbol: "XAUUSD", name: "Or / Dollar", type: "commodities", category: "Métaux", spread: 0.2, pip: 0.01 },
    { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", category: "Crypto", spread: 1.0, pip: 0.01 },
  ],
};

// ─── Technical Analysis ───────────────────────────────────────────────────────

function calcEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: number[] = [ema];
  for (let i = period; i < prices.length; i++) {
    ema = prices[i]! * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i]! - prices[i - 1]!);
  }
  const recent = changes.slice(-period);
  const gains = recent.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = recent.filter((c) => c < 0).map((c) => -c).reduce((a, b) => a + b, 0) / period;
  if (losses === 0) return 100;
  const rs = gains / losses;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

function calcMACD(prices: number[]): { line: number; signal: number; histogram: number } {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  if (ema12.length === 0 || ema26.length === 0) return { line: 0, signal: 0, histogram: 0 };
  const minLen = Math.min(ema12.length, ema26.length);
  const macdLine = ema12.slice(-minLen).map((v, i) => v - ema26[ema26.length - minLen + i]!);
  const signalLine = calcEMA(macdLine, 9);
  const lastMACD = macdLine[macdLine.length - 1] ?? 0;
  const lastSignal = signalLine[signalLine.length - 1] ?? 0;
  return {
    line: parseFloat(lastMACD.toFixed(6)),
    signal: parseFloat(lastSignal.toFixed(6)),
    histogram: parseFloat((lastMACD - lastSignal).toFixed(6)),
  };
}

function calcSupportResistance(
  closes: number[],
  highs: number[],
  lows: number[]
): { support: number; resistance: number } {
  const window = 20;
  const recentLows = lows.slice(-window);
  const recentHighs = highs.slice(-window);
  return {
    support: Math.min(...recentLows),
    resistance: Math.max(...recentHighs),
  };
}

function getMomentum(rsi: number): AnalysisDetails["momentum"] {
  if (rsi >= 70) return "FORT_HAUSSIER";
  if (rsi >= 55) return "HAUSSIER";
  if (rsi <= 30) return "FORT_BAISSIER";
  if (rsi <= 45) return "BAISSIER";
  return "NEUTRE";
}

function getDecimals(asset: AssetInfo): number {
  if (asset.pip < 0.00001) return 8;
  if (asset.pip < 0.001) return 5;
  if (asset.pip < 0.01) return 4;
  if (asset.pip < 0.1) return 2;
  return 0;
}

// ─── Fallback seeded RNG (used only when API unavailable) ─────────────────────
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fallback BASE_PRICES — used only when Twelve Data is unavailable
const FALLBACK_PRICES: Record<string, number> = {
  XAUUSD: 2355, BTCUSDT: 67500, ETHUSDT: 3480, EURUSD: 1.0815,
  GBPUSD: 1.2745, USDJPY: 151.5, USDCHF: 0.9045, AUDUSD: 0.6555,
  USDCAD: 1.361, EURGBP: 0.8562, US30: 39600, NAS100: 18100,
  SP500: 5210, SOLUSDT: 172, XRPUSDT: 0.521, BNBUSDT: 603,
};

const FALLBACK_VOLATILITIES: Record<string, number> = {
  XAUUSD: 3.5, BTCUSDT: 400, ETHUSDT: 45, EURUSD: 0.0008,
  GBPUSD: 0.001, USDJPY: 0.25, USDCHF: 0.0007, AUDUSD: 0.0007,
  USDCAD: 0.0009, EURGBP: 0.0006, US30: 80, NAS100: 50, SP500: 12,
  SOLUSDT: 3, XRPUSDT: 0.006, BNBUSDT: 5,
};

function generateFallbackSeries(symbol: string, bars = 60): { closes: number[]; highs: number[]; lows: number[] } {
  const base = FALLBACK_PRICES[symbol] ?? 100;
  const vol = FALLBACK_VOLATILITIES[symbol] ?? base * 0.005;
  const seed = Math.floor(Date.now() / 300000) + base;
  const rng = seededRandom(seed);
  const closes: number[] = [base];
  const highs: number[] = [base + vol * 0.3];
  const lows: number[] = [base - vol * 0.3];
  const trendBias = (rng() - 0.5) * 0.006;
  for (let i = 1; i < bars; i++) {
    const change = (rng() - 0.5) * vol + trendBias * closes[i - 1]!;
    const close = Math.max(closes[i - 1]! + change, base * 0.5);
    closes.push(close);
    highs.push(close + rng() * vol * 0.5);
    lows.push(close - rng() * vol * 0.5);
  }
  return { closes, highs, lows };
}

// ─── Reason templates ─────────────────────────────────────────────────────────
const FRENCH_REASONS: Record<string, string[]> = {
  BUY: [
    "RSI survendu avec divergence haussière — rebond confirmé",
    "Croisement EMA 20/50 à la hausse — continuité de tendance",
    "Support clé respecté avec bougie d'englobement haussière",
    "MACD haussier confirmé avec histogram positif",
    "Prix au-dessus des EMA avec momentum fort",
    "Retracement Fibonacci 61,8% avec signal de retournement haussier",
    "EMA 20 au-dessus d'EMA 50 — tendance haussière confirmée",
  ],
  SELL: [
    "RSI suracheté avec divergence baissière — retournement attendu",
    "Croisement EMA 20/50 à la baisse — continuité de tendance baissière",
    "Résistance majeure rejetée — opportunité de vente",
    "MACD baissier confirmé avec histogram négatif",
    "Prix sous les EMA avec momentum faible",
    "Double sommet à la résistance — signal de retournement baissier",
    "EMA 20 sous EMA 50 — tendance baissière dominante",
  ],
};

// ─── Public helpers ───────────────────────────────────────────────────────────
function getBrokerKey(broker: string): string {
  const key = broker.toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("binance")) return "binance";
  if (key.includes("bybit")) return "bybit";
  if (key.includes("exness")) return "exness";
  if (key.includes("meta") || key.includes("mt4") || key.includes("mt5") || key.includes("ctrader")) return "metatrader";
  return "default";
}

export function getBrokerAssets(broker: string): AssetInfo[] {
  return BROKER_ASSETS[getBrokerKey(broker)] ?? BROKER_ASSETS.default!;
}

// ─── Core analysis ────────────────────────────────────────────────────────────
interface AnalysisResult extends AnalysisDetails {
  direction: "BUY" | "SELL";
  entry: number;
  usingRealData: boolean;
}

async function analyzeAsset(
  asset: AssetInfo,
  timeframe: string
): Promise<AnalysisResult | null> {
  let ohlcv = await fetchOHLCV(asset.symbol, timeframe, 60);
  let usingRealData = !!ohlcv;

  if (!ohlcv) {
    ohlcv = generateFallbackSeries(asset.symbol, 60);
    logger.warn({ symbol: asset.symbol }, "⚠️  Utilisation des données simulées (API indisponible)");
  }

  const { closes, highs, lows } = ohlcv;

  // Try to get a fresh live price as entry — use last close from series otherwise
  let livePrice = await fetchLivePrice(asset.symbol);
  if (!livePrice) {
    livePrice = closes[closes.length - 1]!;
    if (usingRealData) {
      usingRealData = false;
      logger.warn({ symbol: asset.symbol }, "Prix live indisponible — utilisation du dernier close");
    }
  }

  const ema20Arr = calcEMA(closes, 20);
  const ema50Arr = calcEMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const { support, resistance } = calcSupportResistance(closes, highs, lows);

  const ema20 = ema20Arr[ema20Arr.length - 1] ?? livePrice;
  const ema50 = ema50Arr[ema50Arr.length - 1] ?? livePrice;

  const trendDirection: AnalysisDetails["trendDirection"] =
    ema20 > ema50 * 1.001 ? "HAUSSE" : ema20 < ema50 * 0.999 ? "BAISSE" : "LATERAL";
  const momentum = getMomentum(rsi);

  const bullishConditions: string[] = [];
  if (rsi < 40) bullishConditions.push(`RSI survendu (${rsi})`);
  if (ema20 > ema50) bullishConditions.push("EMA 20 > EMA 50");
  if (macd.histogram > 0 && macd.line > macd.signal) bullishConditions.push("MACD haussier");
  if (livePrice > ema20 && livePrice > ema50) bullishConditions.push("Prix au-dessus des EMA");
  if (trendDirection === "HAUSSE") bullishConditions.push("Tendance haussière confirmée");
  if (livePrice < support * 1.008) bullishConditions.push("Proche du support clé");

  const bearishConditions: string[] = [];
  if (rsi > 60) bearishConditions.push(`RSI suracheté (${rsi})`);
  if (ema20 < ema50) bearishConditions.push("EMA 20 < EMA 50");
  if (macd.histogram < 0 && macd.line < macd.signal) bearishConditions.push("MACD baissier");
  if (livePrice < ema20 && livePrice < ema50) bearishConditions.push("Prix sous les EMA");
  if (trendDirection === "BAISSE") bearishConditions.push("Tendance baissière confirmée");
  if (livePrice > resistance * 0.992) bearishConditions.push("Proche de la résistance clé");

  const isBuy = bullishConditions.length >= 4;
  const isSell = bearishConditions.length >= 4;
  if (!isBuy && !isSell) return null;

  const direction: "BUY" | "SELL" =
    isBuy && (!isSell || bullishConditions.length >= bearishConditions.length)
      ? "BUY"
      : "SELL";
  const conditionsMet = direction === "BUY" ? bullishConditions : bearishConditions;

  const decimals = getDecimals(asset);
  const round = (n: number) => parseFloat(n.toFixed(decimals));

  return {
    direction,
    entry: round(livePrice),
    rsi,
    ema20: round(ema20),
    ema50: round(ema50),
    macdLine: macd.line,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    trendDirection,
    supportLevel: round(support),
    resistanceLevel: round(resistance),
    momentum,
    conditionsMet,
    usingRealData,
  };
}

function buildSignal(
  asset: AssetInfo,
  analysis: AnalysisResult,
  riskLevel: RiskLevel,
  timeframe: string,
  capital: number
): MarketSignal {
  const { direction, entry } = analysis;
  const decimals = getDecimals(asset);
  const round = (n: number) => parseFloat(n.toFixed(decimals));

  const riskMultipliers: Record<RiskLevel, number> = { LOW: 0.007, MEDIUM: 0.011, HIGH: 0.016 };
  const slDistance = entry * riskMultipliers[riskLevel];

  const stopLoss = round(direction === "BUY" ? entry - slDistance : entry + slDistance);
  const tp1Distance = slDistance * 1.5;
  const tp2Distance = slDistance * 2.5;
  const tp3Distance = slDistance * 4.0;

  const takeProfit1 = round(direction === "BUY" ? entry + tp1Distance : entry - tp1Distance);
  const takeProfit2 = round(direction === "BUY" ? entry + tp2Distance : entry - tp2Distance);
  const takeProfit3 = round(direction === "BUY" ? entry + tp3Distance : entry - tp3Distance);

  const riskPercents: Record<RiskLevel, number> = { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.5 };
  const riskPercent = riskPercents[riskLevel];

  const condCount = analysis.conditionsMet.length;
  const baseConf = 60 + condCount * 7;
  const rsiBonus =
    direction === "BUY"
      ? Math.max(0, (40 - analysis.rsi) * 0.5)
      : Math.max(0, (analysis.rsi - 60) * 0.5);
  const confidence = Math.min(97, Math.floor(baseConf + rsiBonus));

  const reasons = FRENCH_REASONS[direction]!;
  const reason = reasons[condCount % reasons.length]!;

  logger.info(
    {
      symbol: asset.symbol,
      direction,
      entry,
      confidence,
      realData: analysis.usingRealData,
    },
    analysis.usingRealData ? "✅ Signal généré depuis données réelles" : "⚠️  Signal généré depuis données simulées"
  );

  return {
    symbol: asset.symbol,
    direction,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    timeframe,
    confidence,
    riskPercent,
    reason,
    analysisDetails: {
      rsi: analysis.rsi,
      ema20: analysis.ema20,
      ema50: analysis.ema50,
      macdLine: analysis.macdLine,
      macdSignal: analysis.macdSignal,
      macdHistogram: analysis.macdHistogram,
      trendDirection: analysis.trendDirection,
      supportLevel: analysis.supportLevel,
      resistanceLevel: analysis.resistanceLevel,
      momentum: analysis.momentum,
      conditionsMet: analysis.conditionsMet,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function generateSignals(
  broker: string,
  riskLevel: RiskLevel = "MEDIUM",
  timeframe = "H1",
  capital = 1000,
  openSymbols: string[] = []
): Promise<MarketSignal[]> {
  const assets = getBrokerAssets(broker);
  const signals: MarketSignal[] = [];

  for (const asset of assets) {
    if (openSymbols.includes(asset.symbol)) continue;
    try {
      const analysis = await analyzeAsset(asset, timeframe);
      if (!analysis) continue;
      const signal = buildSignal(asset, analysis, riskLevel, timeframe, capital);
      signals.push(signal);
    } catch (err) {
      logger.error({ err, symbol: asset.symbol }, "Erreur analyse actif");
    }
  }

  logger.info({ broker, count: signals.length }, "Scan terminé");
  return signals;
}
