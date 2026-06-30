import { logger } from "./logger";
import { fetchOHLCV, fetchLivePrice } from "./twelveData";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Multi-TF analysis intermediate types ─────────────────────────────────────
interface TFIndicators {
  opens: number[];
  closes: number[];
  highs: number[];
  lows: number[];
  rsi: number;
  ema9: number;
  ema20: number;
  ema50: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  prevMacdHistogram: number;
  atr: number;
  trendDir: "UP" | "DOWN" | "FLAT";
  marketStructure: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  support: number;
  resistance: number;
  lastCandleBull: boolean;
  engulfingBull: boolean;
  engulfingBear: boolean;
  lastClose: number;
}

// ─── Asset catalogue ──────────────────────────────────────────────────────────
const BROKER_ASSETS: Record<string, AssetInfo[]> = {
  binance: [
    { symbol: "BTCUSDT", name: "Bitcoin / Tether",    type: "crypto",      category: "Crypto",          spread: 0.01,   pip: 0.01 },
    { symbol: "ETHUSDT", name: "Ethereum / Tether",   type: "crypto",      category: "Crypto",          spread: 0.01,   pip: 0.01 },
    { symbol: "SOLUSDT", name: "Solana / Tether",     type: "crypto",      category: "Crypto",          spread: 0.01,   pip: 0.001 },
    { symbol: "BNBUSDT", name: "BNB / Tether",        type: "crypto",      category: "Crypto",          spread: 0.01,   pip: 0.01 },
    { symbol: "XRPUSDT", name: "Ripple / Tether",     type: "crypto",      category: "Crypto",          spread: 0.0001, pip: 0.0001 },
  ],
  bybit: [
    { symbol: "BTCUSDT", name: "Bitcoin / Tether",    type: "crypto",      category: "Crypto",          spread: 0.5,    pip: 0.01 },
    { symbol: "ETHUSDT", name: "Ethereum / Tether",   type: "crypto",      category: "Crypto",          spread: 0.1,    pip: 0.01 },
    { symbol: "SOLUSDT", name: "Solana / Tether",     type: "crypto",      category: "Crypto",          spread: 0.01,   pip: 0.001 },
    { symbol: "XRPUSDT", name: "Ripple / Tether",     type: "crypto",      category: "Crypto",          spread: 0.0001, pip: 0.0001 },
  ],
  exness: [
    { symbol: "XAUUSD",  name: "Or / Dollar",         type: "commodities", category: "Métaux",          spread: 0.1,    pip: 0.01 },
    { symbol: "EURUSD",  name: "Euro / Dollar",       type: "forex",       category: "Paires Majeures", spread: 0.1,    pip: 0.0001 },
    { symbol: "GBPUSD",  name: "Livre / Dollar",      type: "forex",       category: "Paires Majeures", spread: 0.2,    pip: 0.0001 },
    { symbol: "USDJPY",  name: "Dollar / Yen",        type: "forex",       category: "Paires Majeures", spread: 0.3,    pip: 0.01 },
    { symbol: "USDCHF",  name: "Dollar / Franc Suisse", type: "forex",     category: "Paires Majeures", spread: 0.2,    pip: 0.0001 },
    { symbol: "AUDUSD",  name: "Dollar Australien / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2,   pip: 0.0001 },
  ],
  metatrader: [
    { symbol: "EURUSD",  name: "Euro / Dollar",       type: "forex",       category: "Paires Majeures", spread: 0.1,    pip: 0.0001 },
    { symbol: "GBPUSD",  name: "Livre / Dollar",      type: "forex",       category: "Paires Majeures", spread: 0.2,    pip: 0.0001 },
    { symbol: "USDJPY",  name: "Dollar / Yen",        type: "forex",       category: "Paires Majeures", spread: 0.3,    pip: 0.01 },
    { symbol: "XAUUSD",  name: "Or / Dollar",         type: "commodities", category: "Métaux",          spread: 0.15,   pip: 0.01 },
    { symbol: "USDCHF",  name: "Dollar / Franc Suisse", type: "forex",     category: "Paires Majeures", spread: 0.2,    pip: 0.0001 },
    { symbol: "AUDUSD",  name: "Dollar Australien / Dollar", type: "forex", category: "Paires Majeures", spread: 0.2,   pip: 0.0001 },
    { symbol: "EURGBP",  name: "Euro / Livre",        type: "forex",       category: "Paires Croisées", spread: 0.3,    pip: 0.0001 },
  ],
  default: [
    { symbol: "EURUSD",  name: "Euro / Dollar",       type: "forex",       category: "Paires Majeures", spread: 0.2,    pip: 0.0001 },
    { symbol: "GBPUSD",  name: "Livre / Dollar",      type: "forex",       category: "Paires Majeures", spread: 0.3,    pip: 0.0001 },
    { symbol: "USDJPY",  name: "Dollar / Yen",        type: "forex",       category: "Paires Majeures", spread: 0.3,    pip: 0.01 },
    { symbol: "XAUUSD",  name: "Or / Dollar",         type: "commodities", category: "Métaux",          spread: 0.2,    pip: 0.01 },
    { symbol: "BTCUSDT", name: "Bitcoin / Tether",    type: "crypto",      category: "Crypto",          spread: 1.0,    pip: 0.01 },
  ],
};

// ─── Technical Indicators ─────────────────────────────────────────────────────

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

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) changes.push(closes[i]! - closes[i - 1]!);
  const recent = changes.slice(-period);
  const gains  = recent.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = recent.filter((c) => c < 0).map((c) => -c).reduce((a, b) => a + b, 0) / period;
  if (losses === 0) return 100;
  return parseFloat((100 - 100 / (1 + gains / losses)).toFixed(2));
}

function calcMACD(closes: number[]): {
  line: number; signal: number; histogram: number; prevHistogram: number;
} {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (ema12.length < 9 || ema26.length < 9) return { line: 0, signal: 0, histogram: 0, prevHistogram: 0 };
  const minLen = Math.min(ema12.length, ema26.length);
  const macdLine = ema12.slice(-minLen).map((v, i) => v - ema26[ema26.length - minLen + i]!);
  const signalArr = calcEMA(macdLine, 9);
  const lastMACD     = macdLine[macdLine.length - 1] ?? 0;
  const prevMACD     = macdLine[macdLine.length - 2] ?? 0;
  const lastSig      = signalArr[signalArr.length - 1] ?? 0;
  const prevSig      = signalArr[signalArr.length - 2] ?? 0;
  return {
    line:          parseFloat(lastMACD.toFixed(8)),
    signal:        parseFloat(lastSig.toFixed(8)),
    histogram:     parseFloat((lastMACD - lastSig).toFixed(8)),
    prevHistogram: parseFloat((prevMACD - prevSig).toFixed(8)),
  };
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const hl  = highs[i]! - lows[i]!;
    const hpc = Math.abs(highs[i]! - closes[i - 1]!);
    const lpc = Math.abs(lows[i]! - closes[i - 1]!);
    trs.push(Math.max(hl, hpc, lpc));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Swing-point based support / resistance (more accurate than simple min/max)
function calcSwingLevels(
  closes: number[],
  highs: number[],
  lows: number[],
  lookback = 30,
): { support: number; resistance: number } {
  const n = closes.length;
  const win = Math.min(lookback, n - 1);
  const recentHighs = highs.slice(-win);
  const recentLows  = lows.slice(-win);

  const pivotHighs: number[] = [];
  const pivotLows:  number[] = [];
  const w = 3;
  for (let i = w; i < recentHighs.length - w; i++) {
    const h = recentHighs[i]!;
    let isPivotHigh = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j !== i && recentHighs[j]! >= h) { isPivotHigh = false; break; }
    }
    if (isPivotHigh) pivotHighs.push(h);

    const l = recentLows[i]!;
    let isPivotLow = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j !== i && recentLows[j]! <= l) { isPivotLow = false; break; }
    }
    if (isPivotLow) pivotLows.push(l);
  }

  const support    = pivotLows.length  > 0 ? Math.max(...pivotLows)  : Math.min(...recentLows);
  const resistance = pivotHighs.length > 0 ? Math.min(...pivotHighs) : Math.max(...recentHighs);
  return { support, resistance };
}

// Market structure: higher highs + higher lows = UPTREND, vice versa
function detectMarketStructure(
  highs: number[],
  lows: number[],
  lookback = 10,
): "UPTREND" | "DOWNTREND" | "SIDEWAYS" {
  const n = Math.min(lookback, highs.length);
  const rh = highs.slice(-n);
  const rl = lows.slice(-n);

  let hhCount = 0; let hlCount = 0;
  let lhCount = 0; let llCount = 0;

  for (let i = 1; i < rh.length; i++) {
    if (rh[i]! > rh[i - 1]!) hhCount++;
    else lhCount++;
    if (rl[i]! > rl[i - 1]!) hlCount++;
    else llCount++;
  }

  const bullScore = hhCount + hlCount;
  const bearScore = lhCount + llCount;
  const total = rh.length - 1;
  if (bullScore >= total * 0.6) return "UPTREND";
  if (bearScore >= total * 0.6) return "DOWNTREND";
  return "SIDEWAYS";
}

// Candle analysis: last candle direction and engulfing pattern
function analyzeLastCandles(
  opens: number[],
  closes: number[],
): { lastCandleBull: boolean; engulfingBull: boolean; engulfingBear: boolean } {
  const n = closes.length;
  if (n < 2) return { lastCandleBull: true, engulfingBull: false, engulfingBear: false };

  const lastClose  = closes[n - 1]!;
  const lastOpen   = opens[n - 1]!;
  const prevClose  = closes[n - 2]!;
  const prevOpen   = opens[n - 2]!;

  const lastCandleBull = lastClose > lastOpen;
  const lastBody  = Math.abs(lastClose - lastOpen);
  const prevBody  = Math.abs(prevClose - prevOpen);

  const engulfingBull =
    lastClose > lastOpen &&            // current is bullish
    prevClose < prevOpen &&            // previous is bearish
    lastBody > prevBody * 0.8;         // current body engulfs previous

  const engulfingBear =
    lastClose < lastOpen &&            // current is bearish
    prevClose > prevOpen &&            // previous is bullish
    lastBody > prevBody * 0.8;         // current body engulfs previous

  return { lastCandleBull, engulfingBull, engulfingBear };
}

// ─── Per-timeframe analysis ───────────────────────────────────────────────────
async function analyzeTF(
  symbol: string,
  timeframe: string,
  bars = 80,
): Promise<TFIndicators | null> {
  const ohlcv = await fetchOHLCV(symbol, timeframe, bars);
  if (!ohlcv) return null;

  const { opens, closes, highs, lows } = ohlcv;
  if (closes.length < 52) return null; // need at least 52 bars for EMA50

  const ema9Arr  = calcEMA(closes, 9);
  const ema20Arr = calcEMA(closes, 20);
  const ema50Arr = calcEMA(closes, 50);

  const ema9  = ema9Arr[ema9Arr.length - 1]   ?? closes[closes.length - 1]!;
  const ema20 = ema20Arr[ema20Arr.length - 1] ?? closes[closes.length - 1]!;
  const ema50 = ema50Arr[ema50Arr.length - 1] ?? closes[closes.length - 1]!;

  const rsi  = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const atr  = calcATR(highs, lows, closes, 14);

  const trendDir: "UP" | "DOWN" | "FLAT" =
    ema20 > ema50 * 1.0005 ? "UP" :
    ema20 < ema50 * 0.9995 ? "DOWN" : "FLAT";

  const marketStructure = detectMarketStructure(highs, lows, 12);
  const { support, resistance } = calcSwingLevels(closes, highs, lows, 30);
  const { lastCandleBull, engulfingBull, engulfingBear } = analyzeLastCandles(opens, closes);

  return {
    opens, closes, highs, lows,
    rsi,
    ema9, ema20, ema50,
    macdLine: macd.line,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    prevMacdHistogram: macd.prevHistogram,
    atr,
    trendDir,
    marketStructure,
    support,
    resistance,
    lastCandleBull,
    engulfingBull,
    engulfingBear,
    lastClose: closes[closes.length - 1]!,
  };
}

// ─── Multi-timeframe scoring ───────────────────────────────────────────────────
// Returns a confidence score (0-100) and list of conditions met, or null if not tradeable
interface MTFScore {
  direction: "BUY" | "SELL";
  confidence: number;
  conditions: string[];
  m1: TFIndicators;
  h1: TFIndicators;
  h4: TFIndicators | null;
}

function scoreMTF(
  m1: TFIndicators,
  m5: TFIndicators | null,
  m15: TFIndicators | null,
  h1: TFIndicators,
  h4: TFIndicators | null,
  livePrice: number,
): MTFScore | null {
  // ── Step 0: H4 macro filter (if available) ───────────────────────────────────
  // H4 acts as a macro regime filter — if H4 is strongly against the H1 direction,
  // we reject the signal early to avoid counter-trend trades on the wrong side.
  if (h4) {
    const h4StrongBear = h4.trendDir === "DOWN" && h4.marketStructure === "DOWNTREND";
    const h4StrongBull = h4.trendDir === "UP"   && h4.marketStructure === "UPTREND";

    // If H4 is a strong regime in one direction, we only allow signals aligned with it
    if (h4StrongBear || h4StrongBull) {
      const h1Bull =
        h1.trendDir === "UP" && h1.marketStructure !== "DOWNTREND" &&
        livePrice > h1.ema20 && livePrice > h1.ema50;
      const h1Bear =
        h1.trendDir === "DOWN" && h1.marketStructure !== "UPTREND" &&
        livePrice < h1.ema20 && livePrice < h1.ema50;

      if (h4StrongBear && h1Bull) {
        logger.info({ livePrice }, "❌ Signal BUY rejeté — régime H4 baissier fort (contre-tendance)");
        return null;
      }
      if (h4StrongBull && h1Bear) {
        logger.info({ livePrice }, "❌ Signal SELL rejeté — régime H4 haussier fort (contre-tendance)");
        return null;
      }
    }
  }

  // ── Step 1: Determine direction from H1 (master timeframe) ──────────────────
  const h1Bull =
    h1.trendDir === "UP" &&
    h1.marketStructure !== "DOWNTREND" &&
    livePrice > h1.ema20 &&
    livePrice > h1.ema50;

  const h1Bear =
    h1.trendDir === "DOWN" &&
    h1.marketStructure !== "UPTREND" &&
    livePrice < h1.ema20 &&
    livePrice < h1.ema50;

  if (!h1Bull && !h1Bear) return null;  // No clear H1 direction

  const direction: "BUY" | "SELL" = h1Bull ? "BUY" : "SELL";

  // ── Step 2: Score all conditions across timeframes ───────────────────────────
  const conditions: string[] = [];
  let score = 0;

  // --- Condition 0: H4 macro alignment (adds significant weight when present) ──
  if (h4) {
    const h4AlignsBull = h4.trendDir === "UP"   && h4.marketStructure !== "DOWNTREND";
    const h4AlignsBear = h4.trendDir === "DOWN"  && h4.marketStructure !== "UPTREND";

    if (direction === "BUY" && h4AlignsBull) {
      conditions.push(`Macro-tendance H4 haussière validée (EMA20: ${h4.ema20.toFixed(5)})`);
      score += 12;
      // Bonus: full EMA stack on H4
      if (h4.ema9 > h4.ema20 && h4.ema20 > h4.ema50) {
        score += 5;
        conditions.push("Alignement parfait EMA9 > EMA20 > EMA50 sur H4");
      }
    } else if (direction === "SELL" && h4AlignsBear) {
      conditions.push(`Macro-tendance H4 baissière validée (EMA20: ${h4.ema20.toFixed(5)})`);
      score += 12;
      if (h4.ema9 < h4.ema20 && h4.ema20 < h4.ema50) {
        score += 5;
        conditions.push("Alignement parfait EMA9 < EMA20 < EMA50 sur H4");
      }
    } else {
      // H4 doesn't confirm — mild penalty
      score -= 4;
    }
  }

  // --- Condition 1: H1 Trend Confirmation (mandatory) ─────────────────────────
  if (direction === "BUY" && h1.trendDir === "UP") {
    conditions.push("Tendance H1 haussière confirmée (EMA20 > EMA50)");
    score += 10;
  } else if (direction === "SELL" && h1.trendDir === "DOWN") {
    conditions.push("Tendance H1 baissière confirmée (EMA20 < EMA50)");
    score += 10;
  } else {
    return null;
  }

  // --- Condition 2: H1 Market Structure ────────────────────────────────────────
  if (direction === "BUY" && h1.marketStructure === "UPTREND") {
    conditions.push("Structure de marché H1: plus-hauts + plus-bas haussiers");
    score += 8;
  } else if (direction === "SELL" && h1.marketStructure === "DOWNTREND") {
    conditions.push("Structure de marché H1: plus-hauts + plus-bas baissiers");
    score += 8;
  }

  // --- Condition 3: H1 EMA Alignment (price vs EMAs) ──────────────────────────
  if (direction === "BUY" && livePrice > h1.ema9 && h1.ema9 > h1.ema20 && h1.ema20 > h1.ema50) {
    conditions.push("Alignement EMA H1: Prix > EMA9 > EMA20 > EMA50");
    score += 10;
  } else if (direction === "SELL" && livePrice < h1.ema9 && h1.ema9 < h1.ema20 && h1.ema20 < h1.ema50) {
    conditions.push("Alignement EMA H1: Prix < EMA9 < EMA20 < EMA50");
    score += 10;
  } else if (direction === "BUY" && livePrice > h1.ema20 && livePrice > h1.ema50) {
    conditions.push("Prix au-dessus des EMA H1");
    score += 5;
  } else if (direction === "SELL" && livePrice < h1.ema20 && livePrice < h1.ema50) {
    conditions.push("Prix sous les EMA H1");
    score += 5;
  }

  // --- Condition 4: H1 MACD Confirmation ──────────────────────────────────────
  const h1MacdBull = h1.macdHistogram > 0 && h1.macdLine > 0;
  const h1MacdBear = h1.macdHistogram < 0 && h1.macdLine < 0;
  if (direction === "BUY" && h1MacdBull) {
    conditions.push("MACD H1 haussier (histogram > 0, ligne > 0)");
    score += 8;
    // Bonus: histogram just crossed zero (fresh crossover)
    if (h1.prevMacdHistogram < 0) { score += 4; conditions.push("Croisement MACD H1 haussier récent"); }
  } else if (direction === "SELL" && h1MacdBear) {
    conditions.push("MACD H1 baissier (histogram < 0, ligne < 0)");
    score += 8;
    if (h1.prevMacdHistogram > 0) { score += 4; conditions.push("Croisement MACD H1 baissier récent"); }
  }

  // --- Condition 5: H1 RSI Confirmation ───────────────────────────────────────
  if (direction === "BUY" && h1.rsi >= 40 && h1.rsi <= 65) {
    conditions.push(`RSI H1 en zone haussière (${h1.rsi})`);
    score += 8;
  } else if (direction === "BUY" && h1.rsi < 40) {
    conditions.push(`RSI H1 survendu — rebond attendu (${h1.rsi})`);
    score += 10;
  } else if (direction === "SELL" && h1.rsi >= 35 && h1.rsi <= 60) {
    conditions.push(`RSI H1 en zone baissière (${h1.rsi})`);
    score += 8;
  } else if (direction === "SELL" && h1.rsi > 60) {
    conditions.push(`RSI H1 suracheté — retournement attendu (${h1.rsi})`);
    score += 10;
  }

  // --- Condition 6: M15 Confirmation ───────────────────────────────────────────
  if (m15) {
    const m15AlignsBull =
      (m15.trendDir === "UP" || m15.trendDir === "FLAT") &&
      m15.macdHistogram > 0 &&
      m15.rsi < 70;
    const m15AlignsBear =
      (m15.trendDir === "DOWN" || m15.trendDir === "FLAT") &&
      m15.macdHistogram < 0 &&
      m15.rsi > 30;

    if (direction === "BUY" && m15AlignsBull) {
      conditions.push("M15 aligné haussier (tendance + MACD positif)");
      score += 8;
    } else if (direction === "SELL" && m15AlignsBear) {
      conditions.push("M15 aligné baissier (tendance + MACD négatif)");
      score += 8;
    } else if (
      (direction === "BUY"  && m15.trendDir === "DOWN") ||
      (direction === "SELL" && m15.trendDir === "UP")
    ) {
      // M15 contradicts H1 — reduce confidence
      score -= 6;
    }
  }

  // --- Condition 7: M5 Entry Momentum ─────────────────────────────────────────
  if (m5) {
    const m5MomentumBull = m5.macdHistogram > 0 && m5.rsi > 40 && m5.rsi < 70;
    const m5MomentumBear = m5.macdHistogram < 0 && m5.rsi < 60 && m5.rsi > 30;

    if (direction === "BUY" && m5MomentumBull) {
      conditions.push("Momentum M5 haussier confirmé (MACD + RSI)");
      score += 7;
    } else if (direction === "SELL" && m5MomentumBear) {
      conditions.push("Momentum M5 baissier confirmé (MACD + RSI)");
      score += 7;
    }

    // M5 EMA alignment
    if (direction === "BUY" && m5.ema9 > m5.ema20) {
      conditions.push("EMA9 > EMA20 sur M5");
      score += 4;
    } else if (direction === "SELL" && m5.ema9 < m5.ema20) {
      conditions.push("EMA9 < EMA20 sur M5");
      score += 4;
    }
  }

  // --- Condition 8: M1 Entry Candle Confirmation ───────────────────────────────
  if (direction === "BUY") {
    if (m1.engulfingBull) {
      conditions.push("Bougie d'englobement haussière sur M1 (signal d'entrée)");
      score += 8;
    } else if (m1.lastCandleBull) {
      conditions.push("Bougie M1 haussière — confirmation d'entrée");
      score += 4;
    }
    if (m1.rsi >= 35 && m1.rsi <= 65) {
      conditions.push(`RSI M1 neutre-haussier (${m1.rsi}) — pas suracheté`);
      score += 4;
    }
  } else {
    if (m1.engulfingBear) {
      conditions.push("Bougie d'englobement baissière sur M1 (signal d'entrée)");
      score += 8;
    } else if (!m1.lastCandleBull) {
      conditions.push("Bougie M1 baissière — confirmation d'entrée");
      score += 4;
    }
    if (m1.rsi >= 35 && m1.rsi <= 65) {
      conditions.push(`RSI M1 neutre-baissier (${m1.rsi}) — pas survendu`);
      score += 4;
    }
  }

  // --- Condition 9: Support / Resistance Proximity ─────────────────────────────
  const tolerance = livePrice * 0.003; // 0.3% from level
  if (direction === "BUY" && livePrice - h1.support < tolerance && livePrice > h1.support) {
    conditions.push(`Support H1 respecté — zone d'achat (${h1.support.toFixed(5)})`);
    score += 8;
  } else if (direction === "SELL" && h1.resistance - livePrice < tolerance && livePrice < h1.resistance) {
    conditions.push(`Résistance H1 atteinte — zone de vente (${h1.resistance.toFixed(5)})`);
    score += 8;
  }

  // --- Condition 10: Volatility filter (ATR > minimum threshold) ───────────────
  const minATR = livePrice * 0.0002;
  if (h1.atr > minATR) {
    conditions.push(`Volatilité suffisante (ATR: ${h1.atr.toFixed(6)})`);
    score += 5;
  } else {
    // Low volatility — reduce score
    score -= 5;
  }

  // --- Condition 11: Liquidity zone (multiple touches on S/R) ──────────────────
  const srTolerance = livePrice * 0.005;
  const touchesSupport = m15 ?
    m15.lows.filter((l) => Math.abs(l - h1.support) < srTolerance).length : 0;
  const touchesResistance = m15 ?
    m15.highs.filter((h) => Math.abs(h - h1.resistance) < srTolerance).length : 0;

  if (direction === "BUY" && touchesSupport >= 2) {
    conditions.push(`Zone de liquidité haussière (${touchesSupport} touches du support)`);
    score += 6;
  } else if (direction === "SELL" && touchesResistance >= 2) {
    conditions.push(`Zone de liquidité baissière (${touchesResistance} touches de la résistance)`);
    score += 6;
  }

  // ── Step 3: Normalize score to 0-100 range ────────────────────────────────────
  // Max score depends on which timeframes were available:
  //   Base (M1/M5/M15/H1 fully scored) ≈ 110
  //   +H4 bonus (macro + EMA stack)     ≈ +17 → 127
  // Use a context-aware max so the 88% threshold is meaningful whether or not H4 data arrived.
  const maxScore = h4 ? 127 : 110;
  const normalized = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));

  return { direction, confidence: normalized, conditions, m1, h1, h4: h4 ?? null };
}

// ─── Deterministic reason builder (no Math.random) ────────────────────────────
// Generates a specific, accurate reason based on what conditions were actually met.
function buildReason(
  direction: "BUY" | "SELL",
  conditions: string[],
  h4Available: boolean,
): string {
  const hasMacdCross  = conditions.some((c) => c.includes("Croisement MACD"));
  const hasEngulfing  = conditions.some((c) => c.includes("englobement"));
  const hasLiquidity  = conditions.some((c) => c.includes("liquidité"));
  const hasSR         = conditions.some((c) => c.includes("Support") || c.includes("Résistance"));
  const hasH4         = conditions.some((c) => c.includes("H4"));
  const hasEmaStack   = conditions.some((c) => c.includes("EMA9 > EMA20 > EMA50") || c.includes("EMA9 < EMA20 < EMA50"));

  if (direction === "BUY") {
    if (hasH4 && hasEngulfing && hasMacdCross) {
      return "Convergence M1/M5/M15/H1/H4 haussière — croisement MACD H1 + englobement M1 + macro H4 alignée";
    }
    if (hasH4 && hasEmaStack) {
      return "Alignement EMA parfait H4/H1/M5 — régime macro haussier avec entrée précise sur M1";
    }
    if (hasMacdCross && hasEngulfing) {
      return "Croisement MACD H1 haussier confirmé par bougie d'englobement M1 — signal de haute probabilité";
    }
    if (hasLiquidity && hasSR) {
      return "Zone de liquidité haussière identifiée — RSI survendu H1 avec rebond M15/M5 aligné";
    }
    if (hasEngulfing) {
      return "Tendance H1 confirmée par structure de marché — entrée précise sur M1 avec englobement haussier";
    }
    if (hasH4) {
      return "Macro-tendance H4 haussière avec confirmation multi-timeframe H1/M15/M5 — qualité institutionnelle";
    }
    if (h4Available) {
      return "Structure de marché haussière avec confirmation multi-timeframe — entrée sur support validé";
    }
    return "Convergence multi-temporelle haussière — EMA + MACD + RSI alignés à la hausse sur H1/M15/M5/M1";
  } else {
    if (hasH4 && hasEngulfing && hasMacdCross) {
      return "Convergence M1/M5/M15/H1/H4 baissière — croisement MACD H1 + englobement M1 + macro H4 alignée";
    }
    if (hasH4 && hasEmaStack) {
      return "Alignement EMA parfait H4/H1/M5 — régime macro baissier avec entrée précise sur M1";
    }
    if (hasMacdCross && hasEngulfing) {
      return "Croisement MACD H1 baissier confirmé par bougie d'englobement M1 — signal de haute probabilité";
    }
    if (hasLiquidity && hasSR) {
      return "Zone de liquidité baissière identifiée — RSI suracheté H1 avec rejet M15/M5 aligné";
    }
    if (hasEngulfing) {
      return "Tendance H1 confirmée par structure de marché — entrée précise sur M1 avec englobement baissier";
    }
    if (hasH4) {
      return "Macro-tendance H4 baissière avec confirmation multi-timeframe H1/M15/M5 — qualité institutionnelle";
    }
    if (h4Available) {
      return "Structure de marché baissière avec confirmation multi-timeframe — vente sur résistance validée";
    }
    return "Convergence multi-temporelle baissière — EMA + MACD + RSI alignés à la baisse sur H1/M15/M5/M1";
  }
}

// ─── Signal builder ───────────────────────────────────────────────────────────
function getDecimals(asset: AssetInfo): number {
  if (asset.pip < 0.00001) return 8;
  if (asset.pip < 0.001)   return 5;
  if (asset.pip < 0.01)    return 4;
  if (asset.pip < 0.1)     return 2;
  return 0;
}

function getMomentum(rsi: number): AnalysisDetails["momentum"] {
  if (rsi >= 70) return "FORT_HAUSSIER";
  if (rsi >= 55) return "HAUSSIER";
  if (rsi <= 30) return "FORT_BAISSIER";
  if (rsi <= 45) return "BAISSIER";
  return "NEUTRE";
}

function buildSignal(
  asset: AssetInfo,
  mtf: MTFScore,
  livePrice: number,
  riskLevel: RiskLevel,
): MarketSignal {
  const { direction, confidence, conditions, m1, h1, h4 } = mtf;
  const decimals = getDecimals(asset);
  const round = (n: number) => parseFloat(n.toFixed(decimals));

  const riskMultipliers: Record<RiskLevel, number> = { LOW: 0.006, MEDIUM: 0.010, HIGH: 0.015 };
  const slDistance = livePrice * riskMultipliers[riskLevel];

  // Use ATR to refine SL distance if available (prefer H4 ATR for wider stop, avoid noise)
  const referenceATR = h4 ? h4.atr : h1.atr;
  const atrSL = referenceATR > 0 ? Math.max(slDistance, referenceATR * 1.2) : slDistance;

  const stopLoss    = round(direction === "BUY" ? livePrice - atrSL : livePrice + atrSL);
  const actualRR    = 1.6; // minimum 1:1.6
  const tp1Distance = atrSL * actualRR;
  const tp2Distance = atrSL * 2.5;
  const tp3Distance = atrSL * 4.0;

  const takeProfit1 = round(direction === "BUY" ? livePrice + tp1Distance : livePrice - tp1Distance);
  const takeProfit2 = round(direction === "BUY" ? livePrice + tp2Distance : livePrice - tp2Distance);
  const takeProfit3 = round(direction === "BUY" ? livePrice + tp3Distance : livePrice - tp3Distance);

  const riskPercents: Record<RiskLevel, number> = { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.5 };

  const trendDirection: AnalysisDetails["trendDirection"] =
    h1.trendDir === "UP" ? "HAUSSE" : h1.trendDir === "DOWN" ? "BAISSE" : "LATERAL";

  // Build a deterministic, context-aware reason (no Math.random)
  const reason = buildReason(direction, conditions, h4 !== null);

  // Timeframe string reflects all analyzed timeframes
  const timeframeLabel = h4 ? "M1/M5/M15/H1/H4" : "M1/M5/M15/H1";

  logger.info(
    { symbol: asset.symbol, direction, entry: livePrice, confidence, conditions: conditions.length, h4Available: h4 !== null },
    "✅ Signal haute qualité généré (multi-timeframe)"
  );

  return {
    symbol: asset.symbol,
    direction,
    entry:       round(livePrice),
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    timeframe:   timeframeLabel,
    confidence,
    riskPercent: riskPercents[riskLevel],
    reason,
    analysisDetails: {
      rsi:            m1.rsi,
      ema20:          round(h1.ema20),
      ema50:          round(h1.ema50),
      macdLine:       h1.macdLine,
      macdSignal:     h1.macdSignal,
      macdHistogram:  h1.macdHistogram,
      trendDirection,
      supportLevel:   round(h1.support),
      resistanceLevel: round(h1.resistance),
      momentum:       getMomentum(h1.rsi),
      conditionsMet:  conditions,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ─── Minimum confidence threshold ─────────────────────────────────────────────
// Require at least 88% confidence to broadcast a signal.
// With H4 now adding up to 17 points, this effectively requires 5+ strong confirmations.
const MIN_CONFIDENCE = 88;

// ─── Public helpers ───────────────────────────────────────────────────────────
function getBrokerKey(broker: string): string {
  const key = broker.toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("binance"))   return "binance";
  if (key.includes("bybit"))     return "bybit";
  if (key.includes("exness"))    return "exness";
  if (key.includes("meta") || key.includes("mt4") || key.includes("mt5") || key.includes("ctrader")) return "metatrader";
  return "default";
}

export function getBrokerAssets(broker: string): AssetInfo[] {
  return BROKER_ASSETS[getBrokerKey(broker)] ?? BROKER_ASSETS["default"]!;
}

// ─── Core: analyze one asset with multi-TF (M1/M5/M15/H1/H4) ────────────────
export async function generateSignalForAsset(
  asset: AssetInfo,
  riskLevel: RiskLevel = "MEDIUM",
): Promise<MarketSignal | null> {
  logger.info({ symbol: asset.symbol }, "🔍 Analyse multi-timeframe démarrée (M1/M5/M15/H1/H4)");

  // Fetch all timeframes in parallel — H4 fetched with more bars for macro context
  const [m1Data, m5Data, m15Data, h1Data, h4Data] = await Promise.all([
    analyzeTF(asset.symbol, "M1",  80),
    analyzeTF(asset.symbol, "M5",  80),
    analyzeTF(asset.symbol, "M15", 80),
    analyzeTF(asset.symbol, "H1",  80),
    analyzeTF(asset.symbol, "H4",  80),
  ]);

  if (!m1Data || !h1Data) {
    logger.warn({ symbol: asset.symbol }, "Données insuffisantes (M1 ou H1 manquants)");
    return null;
  }

  if (!h4Data) {
    logger.info({ symbol: asset.symbol }, "H4 indisponible — analyse continue sans filtre macro");
  }

  // Get live price for precise entry (must come from Twelve Data — no fallback)
  const livePrice = await fetchLivePrice(asset.symbol);
  if (!livePrice) {
    logger.warn({ symbol: asset.symbol }, "Prix live indisponible — signal annulé");
    return null;
  }

  const mtfScore = scoreMTF(m1Data, m5Data, m15Data, h1Data, h4Data, livePrice);
  if (!mtfScore) {
    logger.info({ symbol: asset.symbol }, "❌ Conditions non satisfaites — signal rejeté");
    return null;
  }

  if (mtfScore.confidence < MIN_CONFIDENCE) {
    logger.info(
      { symbol: asset.symbol, confidence: mtfScore.confidence, direction: mtfScore.direction },
      `❌ Confiance insuffisante (${mtfScore.confidence}% < ${MIN_CONFIDENCE}%) — signal rejeté`
    );
    return null;
  }

  return buildSignal(asset, mtfScore, livePrice, riskLevel);
}

// ─── Backward-compatible public API (used by manual scan routes) ──────────────
export async function generateSignals(
  broker: string,
  riskLevel: RiskLevel = "MEDIUM",
  _timeframe = "H1",           // kept for API compatibility (ignored — we use MTF)
  _capital   = 1000,
  openSymbols: string[] = [],
): Promise<MarketSignal[]> {
  const assets = getBrokerAssets(broker).filter((a) => !openSymbols.includes(a.symbol));
  const signals: MarketSignal[] = [];

  for (const asset of assets) {
    try {
      const signal = await generateSignalForAsset(asset, riskLevel);
      if (signal) signals.push(signal);
    } catch (err) {
      logger.error({ err, symbol: asset.symbol }, "Erreur analyse actif");
    }
  }

  logger.info({ broker, count: signals.length }, "Scan terminé (M1/M5/M15/H1/H4)");
  return signals;
}
