// services/binance.service.ts
const BASE = process.env.BINANCE_REST || "https://api.binance.com";

/** 24h টিকার তালিকা (Binance /api/v3/ticker/24hr) */
export async function get24hStats() {
  const url = `${BASE}/api/v3/ticker/24hr`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance 24hr failed: ${res.status}`);
  return res.json() as Promise<any[]>;
}

/** এক্সচেঞ্জ ইন্ফো (Binance /api/v3/exchangeInfo) */
export async function getExchangeInfo() {
  const url = `${BASE}/api/v3/exchangeInfo`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance exchangeInfo failed: ${res.status}`);
  return res.json() as Promise<any>;
}

/** bookTicker টাইপ (সিম্পল) */
export type BookTicker = {
  symbol: string;
  bidPrice: string;
  askPrice: string;
  bidQty?: string;
  askQty?: string;
};

/** Raw bookTicker (Binance /api/v3/ticker/bookTicker?symbol=BTCUSDT) */
export async function getBookTicker(symbol: string): Promise<BookTicker> {
  const sym = String(symbol || "").toUpperCase();
  const url = `${BASE}/api/v3/ticker/bookTicker?symbol=${encodeURIComponent(
    sym
  )}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Binance bookTicker failed (${res.status}): ${text || res.statusText}`
    );
  }
  const json = (await res.json()) as any;
  if (
    !json ||
    typeof json.bidPrice !== "string" ||
    typeof json.askPrice !== "string"
  ) {
    throw new Error("Invalid bookTicker payload");
  }
  return {
    symbol: json.symbol ?? sym,
    bidPrice: json.bidPrice,
    askPrice: json.askPrice,
    bidQty: json.bidQty,
    askQty: json.askQty,
  };
}

/** 🔥 Klines (ক্যান্ডেল) – Binance /api/v3/klines */
export async function getKlines(params: {
  symbol: string; // e.g. BTCUSDT
  interval: string; // e.g. 1m, 5m, 1h
  limit?: number; // e.g. 800
}) {
  const q = new URLSearchParams({
    symbol: params.symbol,
    interval: params.interval,
    ...(params.limit ? { limit: String(params.limit) } : {}),
  });
  const url = `${BASE}/api/v3/klines?${q.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance klines failed: ${res.status}`);
  return res.json() as Promise<any[]>;
}
