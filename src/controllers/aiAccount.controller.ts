/* ──────────────────────────────────────────────────────────────────────────
   Account Controller — create/list/update/default/transfer/close
────────────────────────────────────────────────────────────────────────── */
import { ACCOUNT_TYPES, TAccountType } from "@/config/accountTypes";
import { emitPositionOpened } from "@/events/positions";
import Account from "@/models/AiAccount.model";
import AiPosition from "@/models/AiPosition.model";
import { User } from "@/models/user.model";
import { getTopOfBook } from "@/services/quote.service";
import { getContractSpec, isValidLot } from "@/services/specs.service";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { generateAccountNumber } from "@/utils/generateAccountNumber";

function assertAllowedLeverage(t: TAccountType, lv: number) {
  const ok = ACCOUNT_TYPES[t].allowedLeverages.includes(lv);
  if (!ok)
    throw new ApiError(400, "Leverage not allowed for this account type");
}

/* ── Create AI Account ───────────────────────────────── */
export const createAiAccount2: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const { plan, amount } = req.body as {
    plan: string;
    amount: number;
  };

  /* ────────── check user m_balance ────────── */
  if (user.m_balance < amount) {
    throw new ApiError(400, "Insufficient balance");
  }

  const accountNumber = await generateAccountNumber();

  const acc = await Account.create({
    userId,
    customerId: user.customerId,
    accountNumber,
    plan,
    balance: amount,
    equity: amount,
    role: user.role,
    planPrice: amount,
  });

  /* ────────── Update user balance ────────── */
  user.m_balance = user.m_balance - amount;
  await user.save();

  res.status(201).json({ success: true, account: acc });
});

// ── Create AI Account (no session; atomic debit + compensation) ─────────
export const createAiAccount: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;

  const { plan, amount } = req.body as {
    plan: string;
    amount: number;
  };

  // ── basic validation
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new ApiError(400, "Invalid amount");
  }

  // ভাসমান-বিন্দুর ভুল এড়াতে ২-ডেসিমাল রাউন্ড
  const debit = Math.round(amt * 100) / 100;

  // 1) অ্যাটমিক ডেবিট (single-doc atomic) — এখানে সেশন দরকার নেই।
  const user = await User.findOneAndUpdate(
    { _id: userId, m_balance: { $gte: debit } }, // পর্যাপ্ত ব্যালেন্স আছে?
    { $inc: { m_balance: -debit } }, // ব্যালেন্স কাটো
    { new: true }
  );

  if (!user) {
    throw new ApiError(400, "Insufficient balance");
  }

  try {
    // 2) অ্যাকাউন্ট তৈরি (যদি এখানে ব্যর্থ হয় → নিচে রিফান্ড করব)
    const accountNumber = await generateAccountNumber();

    await Account.create({
      userId,
      customerId: user.customerId,
      accountNumber,
      plan,
      balance: debit,
      equity: debit,
      role: user.role,
      planPrice: debit,
      status: "active",
      mode: "ai",
    });

    // (optional) এখানে চাইলে Ledger/Transaction log লিখতে পারো

    // 3) success response
    return res.status(201).json({
      success: true,
      message: "AI account created",
    });
  } catch (err) {
    // 4) compensation (রিফান্ড) — অ্যাকাউন্ট ক্রিয়েট ব্যর্থ হলে কাটার টাকা ফেরত দাও
    await User.updateOne({ _id: userId }, { $inc: { m_balance: debit } });
    throw err; // আসল ভুলটাকেই উপরে ছুঁড়ে দাও
  }
});

/* ── My AI Account ───────────────────────────────── */
export const myAiAccounts: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const items = await Account.find({ userId, status: "active" }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  res.json({ success: true, items });
});

/* ── Get all active AI Account ───────────────────────────────── */
export const getAllAiAccounts: typeHandler = catchAsync(async (req, res) => {
  const items = await Account.find({ status: "active" }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  res.json({ success: true, items });
});

/* ── Get all  AI Accounts role = 'admin' ───────────────────────────────── */
export const getAllAiAccountsForAdmin: typeHandler = catchAsync(
  async (req, res) => {
    const items = await Account.find({ role: "admin" }).sort({
      isDefault: -1,
      createdAt: 1,
    });
    res.json({ success: true, items });
  }
);

/* types */
type PlaceOrderBody = {
  accountId: string;
  symbol: string; // UI or raw
  side: "buy" | "sell";
  lots: number;
  price?: number; // optional client hint
  maxSlippageBps?: number; // optional, e.g. 20 = 0.20%
  takeProfit?: number;
};

/* util */
const round = (v: number, d = 2) => +v.toFixed(d);
const normalizeSymbol = (sym: string) => {
  let s = sym.trim().toUpperCase().replace("/", "");
  if (s.endsWith("USD")) s = s.replace("USD", "USDT"); // UI BTC/USD -> BTCUSDT
  return s;
};

/* ── Place market order (AI) ───────────────────────────── */
export const placeAiMarketOrder2: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "User not authenticated");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const {
    accountId,
    symbol: uiSymbol,
    side,
    lots,
    price, // ⬅️ UI  (authoritative)
    maxSlippageBps,
    takeProfit,
  } = (req.body || {}) as PlaceOrderBody;

  if (!accountId || !uiSymbol || !side || !lots || !takeProfit || !price) {
    throw new ApiError(400, "Missing required fields");
  }
  if (side !== "buy" && side !== "sell") {
    throw new ApiError(400, "Invalid side");
  }
  if (!(typeof lots === "number" && lots > 0)) {
    throw new ApiError(400, "Invalid lot size");
  }

  // ownership + active
  const acc = await Account.findOne({ _id: accountId, userId });
  if (!acc) throw new ApiError(404, "Account not found");
  if (acc.status !== "active") throw new ApiError(400, "Account not active");

  // normalize + spec + lot validation
  const symbol = normalizeSymbol(uiSymbol);
  const spec = getContractSpec(symbol); // crypto => contractSize=1
  if (!isValidLot(lots, spec.minLot, spec.stepLot, spec.maxLot)) {
    throw new ApiError(400, "Invalid lot size");
  }

  // --- server quote
  const q = await getTopOfBook(symbol);
  const qSide = side === "buy" ? q.ask : q.bid;
  if (!Number.isFinite(qSide) || qSide <= 0) {
    throw new ApiError(503, "Price unavailable");
  }

  // --- UI price authoritative -> tick/digits
  if (!Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, "Invalid client price");
  }
  const tickFromDigits = (d: number) => Number((1 / 10 ** d).toFixed(d));
  const tick = tickFromDigits(spec.digits);
  const roundToTick = (n: number, t: number) => Math.round(n / t) * t;

  const entryPrice = roundToTick(price, tick); // ✅

  const tolBps = Number(process.env.UI_PRICE_TOL_BPS ?? 50);
  const drift = Math.abs(entryPrice - qSide) / qSide;
  if (drift > tolBps / 10_000) {
    throw new ApiError(400, "Client price out of range");
  }

  if (maxSlippageBps && maxSlippageBps > 0) {
    const diff = Math.abs(qSide - entryPrice) / entryPrice;
    const max = maxSlippageBps / 10_000;
    if (diff > max)
      throw new ApiError(400, "Price changed (slippage exceeded)");
  }

  // --- margin/commission ***entryPrice***
  const notional = entryPrice * spec.contractSize * lots; // ✅ fixed
  const commissionOpen = spec.commissionPerLot * lots;

  /* ────────── calculate manipulateClosePrice with entryPrice and takeProfit ────────── */

  const manipulateClosePrice =
    takeProfit && takeProfit > 0 ? roundToTick(takeProfit, tick) : undefined;

  const pos = await AiPosition.create({
    accountId: acc._id,
    plan: acc.plan,
    planPrice: acc.planPrice,
    userId,
    customerId: user.customerId,
    symbol,
    side,
    lots,
    contractSize: spec.contractSize, // crypto = 1
    entryPrice, // ✅ UI authoritative
    margin: 0,
    commissionOpen,
    status: "open",
    openedAt: new Date(),
    takeProfit,
  });

  emitPositionOpened(pos, "market");

  acc.balance = round((acc.balance ?? 0) - commissionOpen, 2);
  acc.equity = acc.balance;
  await acc.save();

  res.status(201).json({
    success: true,
    position: {
      _id: pos._id,
      accountId: pos.accountId,
      userId: pos.userId,
      customerId: pos.customerId,
      symbol: pos.symbol,
      side: pos.side,
      lots: pos.lots,
      contractSize: pos.contractSize,
      entryPrice: +pos.entryPrice.toFixed(spec.digits),
      margin: round(pos.margin, 2),
      openedAt: pos.openedAt,
      status: pos.status,
      takeProfit: pos.takeProfit,
    },
    account: {
      balance: acc.balance,
      equity: acc.equity,
      currency: acc.currency,
    },
    quote: { bid: q.bid, ask: q.ask, ts: q.ts },
  });
});

/* ── Place market order (AI) — with manipulateClosePrice = entryPrice - takeProfit ───────── */
export const placeAiMarketOrder: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "User not authenticated");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const {
    accountId,
    symbol: uiSymbol,
    side,
    lots,
    price, // ⬅️ UI (authoritative)
    maxSlippageBps,
    takeProfit, // ⬅️ used below
  } = (req.body || {}) as PlaceOrderBody;

  if (!accountId || !uiSymbol || !side || !lots || !takeProfit || !price) {
    throw new ApiError(400, "Missing required fields");
  }
  if (side !== "buy" && side !== "sell") {
    throw new ApiError(400, "Invalid side");
  }
  if (!(typeof lots === "number" && lots > 0)) {
    throw new ApiError(400, "Invalid lot size");
  }

  // ownership + active
  const acc = await Account.findOne({ _id: accountId, userId });
  if (!acc) throw new ApiError(404, "Account not found");
  if (acc.status !== "active") throw new ApiError(400, "Account not active");

  // normalize + spec + lot validation
  const symbol = normalizeSymbol(uiSymbol);
  const spec = getContractSpec(symbol); // crypto => contractSize=1
  if (!isValidLot(lots, spec.minLot, spec.stepLot, spec.maxLot)) {
    throw new ApiError(400, "Invalid lot size");
  }

  // --- server quote
  const q = await getTopOfBook(symbol);
  const qSide = side === "buy" ? q.ask : q.bid;
  if (!Number.isFinite(qSide) || qSide <= 0) {
    throw new ApiError(503, "Price unavailable");
  }

  // --- UI price authoritative -> tick/digits
  if (!Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, "Invalid client price");
  }
  const tickFromDigits = (d: number) => Number((1 / 10 ** d).toFixed(d));
  const tick = tickFromDigits(spec.digits);
  const roundToTick = (n: number, t: number) => Math.round(n / t) * t;

  const entryPrice = roundToTick(price, tick); // ✅

  const tolBps = Number(process.env.UI_PRICE_TOL_BPS ?? 50);
  const drift = Math.abs(entryPrice - qSide) / qSide;
  if (drift > tolBps / 10_000) {
    throw new ApiError(400, "Client price out of range");
  }

  if (maxSlippageBps && maxSlippageBps > 0) {
    const diff = Math.abs(qSide - entryPrice) / entryPrice;
    const max = maxSlippageBps / 10_000;
    if (diff > max)
      throw new ApiError(400, "Price changed (slippage exceeded)");
  }

  // --- margin/commission (use entryPrice)
  const notional = entryPrice * spec.contractSize * lots;
  const commissionOpen = spec.commissionPerLot * lots;

  /* ────────── manipulateClosePrice = entryPrice - takeProfit (rounded to tick) ──────────
     নোট: এখানে আপনার চাহিদামাফিক সরাসরি subtract করা হয়েছে।
     যদি takeProfit "target price" হয় (ডেল্টা নয়), তাহলে আপনার লজিক আলাদা হতে পারে।
  */
  let manipulateClosePrice: number | undefined = undefined;
  if (Number.isFinite(takeProfit) && (takeProfit as number) > 0) {
    const raw = entryPrice - (takeProfit as number);
    const rounded = roundToTick(raw, tick);
    manipulateClosePrice =
      Number.isFinite(rounded) && rounded > 0 ? rounded : undefined;
  }

  const pos = await AiPosition.create({
    accountId: acc._id,
    plan: acc.plan,
    planPrice: acc.planPrice,
    userId,
    customerId: user.customerId,
    symbol,
    side,
    lots,
    contractSize: spec.contractSize,
    entryPrice, // ✅ UI authoritative
    margin: 0,
    commissionOpen,
    status: "open",
    openedAt: new Date(),
    takeProfit, // keep original input
    manipulateClosePrice,
  });

  emitPositionOpened(pos, "market");

  acc.balance = round((acc.balance ?? 0) - commissionOpen, 2);
  acc.equity = acc.balance;
  await acc.save();

  res.status(201).json({
    success: true,
    position: {
      _id: pos._id,
      accountId: pos.accountId,
      userId: pos.userId,
      customerId: pos.customerId,
      symbol: pos.symbol,
      side: pos.side,
      lots: pos.lots,
      contractSize: pos.contractSize,
      entryPrice: +pos.entryPrice.toFixed(spec.digits),
      margin: round(pos.margin, 2),
      openedAt: pos.openedAt,
      status: pos.status,
      takeProfit: pos.takeProfit,
      manipulateClosePrice, // ⬅️ এখানে রেসপন্সে পাঠানো হচ্ছে
    },
    account: {
      balance: acc.balance,
      equity: acc.equity,
      currency: acc.currency,
    },
    quote: { bid: q.bid, ask: q.ask, ts: q.ts },
  });
});

/* ── Get all active AiPositions  ───────────────────────────── */
export const getActiveAiPositions: typeHandler = catchAsync(
  async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "User not authenticated");

    const positions = await AiPosition.find({ userId });
    res.status(200).json({ success: true, items: positions });
  }
);

/* ── Get all active AiPositions for users  ───────────────────────────── */
export const getActiveAiPositionsForUser: typeHandler = catchAsync(
  async (req, res) => {
    const positions = await AiPosition.find({
      status: "open",
    });
    res.status(200).json({ success: true, items: positions });
  }
);

/* ── Get all active AiPositions for users  ───────────────────────────── */
export const getClosedAiPositionsForUser: typeHandler = catchAsync(
  async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "User not authenticated");

    const positions = await AiPosition.find({
      status: "closed",
      userId,
    });
    res.status(200).json({ success: true, items: positions });
  }
);

/* ── Close position (DEMO, no transaction) ───────────────── */
export const closeAiPosition: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "User not authenticated");

  const { id } = req.params as { id: string };

  const pos = await AiPosition.findById(id);
  if (!pos) throw new ApiError(404, "Position not found");
  if (pos.status !== "open") throw new ApiError(400, "Position already closed");

  const acc = await Account.findOne({ _id: pos.accountId, userId });
  if (!acc) throw new ApiError(403, "Not allowed");

  // normalize numbers
  const lots = Number(pos.lots);
  const entry = Number(pos.entryPrice);
  const csize = Number(pos.contractSize ?? 1);
  const posMargin = Number(pos.margin ?? 0);
  if (![lots, entry, csize].every(Number.isFinite)) {
    throw new ApiError(400, "Invalid position numbers");
  }

  // opposite-side close price
  const q = await getTopOfBook(String(pos.symbol));
  const closePx = pos.side === "buy" ? Number(q.bid) : Number(q.ask);
  if (!Number.isFinite(closePx) || closePx <= 0) {
    throw new ApiError(503, "Price unavailable");
  }

  // P/L
  const diff = pos.side === "buy" ? closePx - entry : entry - closePx;
  const gross = diff * csize * lots;
  const commissionClose = 0; // demo
  const net = round(gross - commissionClose, 2);

  // try to close position (idempotent)
  const now = new Date();
  const closed = await AiPosition.findOneAndUpdate(
    { _id: pos._id, status: "open" },
    {
      $set: {
        status: "closed",
        closedAt: now,
        closePrice: closePx,
        commissionClose,
        pnl: net,
      },
    },
    { new: true }
  );
  if (!closed) throw new ApiError(400, "Position already closed");

  // update account (no session; last-write-wins)

  const newBalance = round(Number(acc.balance ?? 0) + net, 2);
  const newEquity = newBalance; // demo: equity == balance (live equity shown on client)

  // await Account.updateOne(
  //   { _id: acc._id, userId },
  //   {
  //     $set: {
  //       balance: newBalance,
  //       equity: newEquity,
  //     },
  //   }
  // );

  const spec = getContractSpec(String(pos.symbol));

  res.json({
    success: true,
    position: {
      _id: closed._id,
      status: closed.status,
      closePrice: +closePx.toFixed(spec.digits),
      pnl: closed.pnl,
      closedAt: closed.closedAt,
    },
    account: {
      balance: newBalance,
      equity: newEquity,
    },
  });
});
