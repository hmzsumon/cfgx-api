// controllers/crypto.controller.ts
import {
  getKlines as binanceGetKlines,
  get24hStats,
  getExchangeInfo,
} from "@/services/binance.service";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { getCache, setCache } from "@/utils/cache";
import { catchAsync } from "@/utils/catchAsync";

/* ────────── GET /crypto/most  → 60s cache ────────── */
export const getMostCrypto: typeHandler = catchAsync(async (_req, res) => {
  const CACHE_KEY = "crypto:most";
  const cached = getCache<any>(CACHE_KEY);
  if (cached) return res.status(200).json({ success: true, ...cached });

  const all = await get24hStats(); // Binance /api/v3/ticker/24hr
  if (!Array.isArray(all))
    throw new ApiError(502, "Invalid 24h stats payload from Binance");

  const rows = all
    .filter(
      (r: any) =>
        typeof r?.symbol === "string" &&
        r.symbol.endsWith("USDT") &&
        !r.symbol.includes("UP") &&
        !r.symbol.includes("DOWN")
    )
    .sort((a: any, b: any) => Number(b.quoteVolume) - Number(a.quoteVolume))
    .slice(0, 30)
    .map((r: any) => ({
      symbol: r.symbol, // e.g. BTCUSDT
      display: r.symbol.replace("USDT", "/USD"), // BTC/USD
      last: Number(r.lastPrice),
      change: Number(r.priceChangePercent),
      quoteVolume: Number(r.quoteVolume),
    }));

  const payload = { mostTraded: rows };
  setCache(CACHE_KEY, payload, 60_000); // 60s TTL
  return res.status(200).json({ success: true, ...payload });
});

/* ────────── GET /crypto/symbols  → 1h cache ────────── */
export const getUsdts: typeHandler = catchAsync(async (_req, res) => {
  const CACHE_KEY = "crypto:symbols:usdt";
  const cached = getCache<any>(CACHE_KEY);
  if (cached) return res.status(200).json({ success: true, ...cached });

  const info = await getExchangeInfo(); // Binance /api/v3/exchangeInfo
  const symbols = (info?.symbols || [])
    .filter(
      (s: any) =>
        s?.status === "TRADING" &&
        s?.quoteAsset === "USDT" &&
        typeof s?.symbol === "string"
    )
    .map((s: any) => ({
      symbol: s.symbol, // BTCUSDT
      base: s.baseAsset, // BTC
      display: `${s.baseAsset}/USD`, // BTC/USD
    }))
    .sort((a: any, b: any) => a.base.localeCompare(b.base));

  const payload = { symbols };
  setCache(CACHE_KEY, payload, 3_600_000); // 1h TTL
  return res.status(200).json({ success: true, ...payload });
});

/* ────────── ✅ GET /crypto/klines?symbol=BTCUSDT&interval=1m&limit=800 ────────── */
export const getKlines: typeHandler = catchAsync(async (req, res) => {
  const rawSym = String(req.query.symbol || "")
    .toUpperCase()
    .replace("/", "");
  const interval = String(req.query.interval || "1m");
  const limit = req.query.limit ? Number(req.query.limit) : 800;

  if (!rawSym) throw new ApiError(400, "symbol is required");

  // USD → USDT normalize (BTC/USD → BTCUSDT)
  const symbol = rawSym.endsWith("USD")
    ? rawSym.replace("USD", "USDT")
    : rawSym;

  const raw = await binanceGetKlines({ symbol, interval, limit });

  // Binance klines format: [ openTime, open, high, low, close, volume, closeTime, ... ]
  const data = raw.map((k: any[]) => ({
    time: Math.floor(Number(k[0]) / 1000), // seconds
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));

  res.json({ success: true, data });
});
