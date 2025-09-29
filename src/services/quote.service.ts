// services/quote.service.ts
import { getBookTicker } from "@/services/binance.service";

/** Helper: normalize symbols like BTC/USD -> BTCUSDT */
export function normalizeSymbol(sym: string) {
  let s = String(sym || "")
    .toUpperCase()
    .replace("/", "");
  if (s.endsWith("USD")) s = s.replace("USD", "USDT");
  return s;
}

/** ENV/Config driven spread policy */
const SPREAD_CFG = {
  // শতাংশ স্প্রেড (basis points): 8 bps = 0.08%
  DEFAULT_BPS: Number(process.env.SPREAD_BPS_DEFAULT ?? 8),
  // BTC পেয়ারে মিনিমাম অ্যাবসোলিউট স্প্রেড (USDT ~= USD)
  BTC_MIN_ABS: Number(process.env.SPREAD_BTC_MIN_ABS ?? 12), // $12 floor
  // অন্য সিম্বলের ফ্লোর (ইচ্ছা হলে কনফিগে নাও)
  FLOORS: {
    ETHUSDT: Number(process.env.SPREAD_ETH_MIN_ABS ?? 2),
    SOLUSDT: Number(process.env.SPREAD_SOL_MIN_ABS ?? 0.2),
    XAUUSD: Number(process.env.SPREAD_XAU_MIN_ABS ?? 0.05),
  } as Record<string, number>,
};

/** Core spread logic: mid থেকে bid/ask বানাও */
function applySpread(symbol: string, rawBid: number, rawAsk: number) {
  if (
    !Number.isFinite(rawBid) ||
    !Number.isFinite(rawAsk) ||
    rawBid <= 0 ||
    rawAsk <= 0
  ) {
    throw new Error("Invalid raw quote");
  }

  const s = normalizeSymbol(symbol);
  const mid = (rawBid + rawAsk) / 2;

  // শতাংশ-ভিত্তিক স্প্রেড (bps)
  const bps = SPREAD_CFG.DEFAULT_BPS; // e.g. 8 bps = 0.08%
  const pctAbs = mid * (bps / 10_000);

  // অ্যাবসোলিউট ফ্লোর
  let floorAbs = 0;
  if (s.startsWith("BTC"))
    floorAbs = Math.max(floorAbs, SPREAD_CFG.BTC_MIN_ABS);
  if (SPREAD_CFG.FLOORS[s]) floorAbs = Math.max(floorAbs, SPREAD_CFG.FLOORS[s]);

  // ফাইনাল স্প্রেড = max(percentage, floor)
  const spreadAbs = Math.max(pctAbs, floorAbs);
  const half = spreadAbs / 2;

  const bid = +(mid - half).toFixed(8);
  const ask = +(mid + half).toFixed(8);

  // গ্যারান্টি: ask > bid
  if (!(ask > bid)) {
    return {
      bid: +Math.min(rawBid, rawAsk - 1e-8).toFixed(8),
      ask: +Math.max(rawAsk, rawBid + 1e-8).toFixed(8),
      ts: Date.now(),
    };
  }
  return { bid, ask, ts: Date.now() };
}

/** One true source of top-of-book (spread applied) */
export async function getTopOfBook(
  symbol: string
): Promise<{ bid: number; ask: number; ts: number }> {
  const s = normalizeSymbol(symbol);

  // Binance REST: bookTicker
  const raw = await getBookTicker(s); // { bidPrice, askPrice, ... }

  // ✅ শুধুই টাইপে থাকা ফিল্ড ব্যবহার করো
  const rawBid = Number(raw?.bidPrice);
  const rawAsk = Number(raw?.askPrice);

  return applySpread(s, rawBid, rawAsk);
}
