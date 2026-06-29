import { logger } from "./logger";

const API_KEY = process.env["TWELVE_DATA_API_KEY"];
const BASE_URL = "https://api.twelvedata.com";

// ─── Symbol Mapping to Twelve Data format ─────────────────────────────────────
const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  EURGBP: "EUR/GBP",
  NZDUSD: "NZD/USD",
  XAUUSD: "XAU/USD",
  XAGUSD: "XAG/USD",
  BTCUSDT: "BTC/USD",
  ETHUSDT: "ETH/USD",
  SOLUSDT: "SOL/USD",
  XRPUSDT: "XRP/USD",
  BNBUSDT: "BNB/USD",
  LINKUSDT: "LINK/USD",
  ADAUSDT: "ADA/USD",
  DOGEUSDT: "DOGE/USD",
  AVAXUSDT: "AVAX/USD",
  US30: "DJI",
  NAS100: "QQQ",
  SP500: "SPY",
  USOIL: "USO",
};

// ─── Cache ────────────────────────────────────────────────────────────────────
interface OHLCVEntry {
  closes: number[];
  highs: number[];
  lows: number[];
  timestamp: number;
}

interface PriceCacheEntry {
  price: number;
  timestamp: number;
}

const ohlcvCache = new Map<string, OHLCVEntry>();
const priceCache = new Map<string, PriceCacheEntry>();

const OHLCV_TTL = 5 * 60 * 1000;
const PRICE_TTL = 30 * 1000;

// ─── Rate limiting (8 req/min for free tier) ──────────────────────────────────
let requestsThisMinute = 0;
let minuteStart = Date.now();

function canMakeRequest(): boolean {
  const now = Date.now();
  if (now - minuteStart > 60_000) {
    requestsThisMinute = 0;
    minuteStart = now;
  }
  return requestsThisMinute < 7;
}

function recordRequest(): void {
  requestsThisMinute++;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getTwelveSymbol(symbol: string): string {
  return SYMBOL_MAP[symbol] ?? symbol;
}

export function intervalFromTimeframe(timeframe: string): string {
  const map: Record<string, string> = {
    M1: "1min",
    M5: "5min",
    M15: "15min",
    H1: "1h",
    H4: "4h",
    D1: "1day",
  };
  return map[timeframe] ?? "1h";
}

// ─── OHLCV fetch ──────────────────────────────────────────────────────────────
interface TimeSeriesResponse {
  values?: Array<{ close: string; high: string; low: string; datetime: string }>;
  status?: string;
  message?: string;
  code?: number;
}

export interface OHLCVData {
  closes: number[];
  highs: number[];
  lows: number[];
}

export async function fetchOHLCV(
  symbol: string,
  timeframe = "H1",
  bars = 60
): Promise<OHLCVData | null> {
  const cacheKey = `${symbol}:${timeframe}`;
  const cached = ohlcvCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OHLCV_TTL) {
    return { closes: cached.closes, highs: cached.highs, lows: cached.lows };
  }

  if (!API_KEY) {
    logger.warn("TWELVE_DATA_API_KEY manquant — données réelles indisponibles");
    return null;
  }

  if (!canMakeRequest()) {
    logger.warn({ symbol }, "Limite API Twelve Data atteinte — utilisation du cache");
    if (cached) return { closes: cached.closes, highs: cached.highs, lows: cached.lows };
    return null;
  }

  const tdSymbol = getTwelveSymbol(symbol);
  const interval = intervalFromTimeframe(timeframe);
  const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=${bars}&apikey=${API_KEY}`;

  try {
    recordRequest();
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const data = (await response.json()) as TimeSeriesResponse;

    if (data.status === "error" || data.code) {
      logger.warn({ symbol, msg: data.message }, "Twelve Data erreur OHLCV");
      return null;
    }

    if (!data.values || data.values.length === 0) {
      logger.warn({ symbol }, "Twelve Data: aucune valeur retournée");
      return null;
    }

    const reversed = [...data.values].reverse();
    const closes = reversed.map((v) => parseFloat(v.close));
    const highs = reversed.map((v) => parseFloat(v.high));
    const lows = reversed.map((v) => parseFloat(v.low));

    ohlcvCache.set(cacheKey, { closes, highs, lows, timestamp: Date.now() });
    logger.info({ symbol, bars: closes.length, timeframe }, "✅ Données OHLCV réelles récupérées");
    return { closes, highs, lows };
  } catch (err) {
    logger.error({ err, symbol }, "Erreur fetch Twelve Data OHLCV");
    return null;
  }
}

// ─── Live price fetch ─────────────────────────────────────────────────────────
interface PriceResponse {
  price?: string;
  status?: string;
  message?: string;
}

export async function fetchLivePrice(symbol: string): Promise<number | null> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_TTL) {
    return cached.price;
  }

  if (!API_KEY) return null;

  if (!canMakeRequest()) {
    return cached?.price ?? null;
  }

  const tdSymbol = getTwelveSymbol(symbol);
  const url = `${BASE_URL}/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${API_KEY}`;

  try {
    recordRequest();
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    const data = (await response.json()) as PriceResponse;

    if (data.status === "error" || !data.price) {
      logger.warn({ symbol, msg: data.message }, "Twelve Data erreur prix live");
      return null;
    }

    const price = parseFloat(data.price);
    if (isNaN(price)) return null;

    priceCache.set(symbol, { price, timestamp: Date.now() });
    logger.info({ symbol, price }, "✅ Prix live récupéré depuis Twelve Data");
    return price;
  } catch (err) {
    logger.error({ err, symbol }, "Erreur fetch prix live");
    return null;
  }
}

// ─── Batch live prices ────────────────────────────────────────────────────────
interface BatchPriceResponse {
  [symbol: string]: { price?: string; status?: string; message?: string };
}

export async function fetchBatchPrices(symbols: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  // Check cache first
  const needed: string[] = [];
  for (const sym of symbols) {
    const cached = priceCache.get(sym);
    if (cached && Date.now() - cached.timestamp < PRICE_TTL) {
      result[sym] = cached.price;
    } else {
      needed.push(sym);
    }
  }

  if (needed.length === 0 || !API_KEY || !canMakeRequest()) {
    return result;
  }

  const tdSymbols = needed.map(getTwelveSymbol).join(",");
  const url = `${BASE_URL}/price?symbol=${encodeURIComponent(tdSymbols)}&apikey=${API_KEY}`;

  try {
    recordRequest();
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const data = (await response.json()) as BatchPriceResponse | PriceResponse;

    if ("price" in data && data.price) {
      const sym = needed[0]!;
      const price = parseFloat(data.price);
      if (!isNaN(price)) {
        result[sym] = price;
        priceCache.set(sym, { price, timestamp: Date.now() });
      }
    } else {
      const batch = data as BatchPriceResponse;
      for (let i = 0; i < needed.length; i++) {
        const sym = needed[i]!;
        const tdSym = getTwelveSymbol(sym);
        const entry = batch[tdSym] ?? batch[sym];
        if (entry?.price) {
          const price = parseFloat(entry.price);
          if (!isNaN(price)) {
            result[sym] = price;
            priceCache.set(sym, { price, timestamp: Date.now() });
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Erreur batch prix Twelve Data");
  }

  return result;
}
