/* ──────────────────────────────────────────────────────────────────────────
   Account Controller — create/list/update/default/transfer/close
────────────────────────────────────────────────────────────────────────── */
import { ACCOUNT_TYPES, TAccountType } from "@/config/accountTypes";
import { emitPositionOpened } from "@/events/positions";
import Account from "@/models/AiAccount.model";
import AiPosition from "@/models/AiPosition.model";
import SystemStats from "@/models/SystemStats.model";
import { User } from "@/models/user.model";
import UserWallet from "@/models/UserWallet.model";
import { sendPushToUser } from "@/services/push.service";
import { getTopOfBook } from "@/services/quote.service";
import { getContractSpec, isValidLot } from "@/services/specs.service";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { applySponsorBonus } from "@/utils/applySponsorBonus";
import { catchAsync } from "@/utils/catchAsync";
import { generateAccountNumber } from "@/utils/generateAccountNumber";
import TransactionManager from "@/utils/TransactionManager";
import updateTeamAiTradeInfo from "@/utils/updateTeamAiTradeInfo";

function assertAllowedLeverage(t: TAccountType, lv: number) {
  const ok = ACCOUNT_TYPES[t].allowedLeverages.includes(lv);
  if (!ok)
    throw new ApiError(400, "Leverage not allowed for this account type");
}

// ── Create AI Account (no session; atomic debit + compensation) ─────────
export const createAiAccount: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;

  const { plan, amount } = req.body as {
    plan: string;
    amount: number;
  };

  /* ────────── check user m_balance ────────── */
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new ApiError(400, "Invalid amount");
  }

  const debit = Math.round(amt * 100) / 100;

  // Atomic debit (must have sufficient balance)
  const user = await User.findOneAndUpdate(
    { _id: userId, m_balance: { $gte: debit } },
    { $inc: { m_balance: -debit } },
    { new: true }
  );

  if (!user) {
    throw new ApiError(400, "Insufficient balance");
  }

  let createdAccountId: string | null = null;
  let createdAccountNumber: string | null = null;

  try {
    const accountNumber = await generateAccountNumber();

    const account = await Account.create({
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

    createdAccountId = account._id?.toString?.() ?? null;
    createdAccountNumber = accountNumber;

    /* ────────── set is_active_aiTrade=true; if is_new===true → set to false ────────── */
    /* ────────── step 1: ensure aiTrade active ────────── */
    await User.updateOne(
      { _id: userId, is_active_aiTrade: { $ne: true } },
      { $set: { is_active_aiTrade: true } }
    );

    /* ────────── step 2: flip is_new → false only if currently true ────────── */
    await User.updateOne(
      { _id: userId, is_new: true },
      { $set: { is_new: false } }
    );

    await updateTeamAiTradeInfo(userId as string, debit);

    if (user.is_new) {
      await applySponsorBonus({
        userName: user.name,
        sponsorId: user.sponsorId as any,
        amount,
        plan,
      });
    }
    // non-blocking
    // void updateTeamAiTradeInfo(userId, debit);

    /* ────────── cash out transactions ────────── */
    const txManager = new TransactionManager();
    await txManager.createTransaction({
      userId: String(user._id),
      customerId: user.customerId,
      transactionType: "cashOut",
      amount: debit,
      purpose: "Create Ai Account",
      description: `Created AI account for ${amount} USDT in ${plan} ai plan`,
    });

    /* ────────── Find user wallet and update totalAiTradeBalance ────────── */
    const wallet = await UserWallet.findOne({ userId });
    if (wallet) {
      wallet.totalAiTradeBalance += debit;
      await wallet.save();
    }

    /* ────────── Find company wallet and update totalAiTradeBalance ────────── */
    const companyWallet = await SystemStats.findOne();
    if (companyWallet) {
      companyWallet.totalAiTradeBalance += debit;
      companyWallet.todayAiTradeBalance += debit;
      await companyWallet.save();
    }

    // Success response
    return res.status(201).json({
      success: true,
      message: "AI account created",
    });
  } catch (err) {
    // Compensation: refund debit
    await User.updateOne({ _id: userId }, { $inc: { m_balance: debit } });

    // If an account was created but something else failed (e.g., flag set), remove the account
    if (createdAccountId) {
      await Account.deleteOne({ _id: createdAccountId });
    } else if (createdAccountNumber) {
      await Account.deleteOne({ userId, accountNumber: createdAccountNumber });
    }

    throw err;
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
  const spec = getContractSpec(symbol);
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

  const entryPrice = roundToTick(price, tick);

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

  /* ────────── manipulateClosePrice by side (tick-rounded) ──────────
     Rule:
     - BUY  => entryPrice + takeProfit
     - SELL => entryPrice - takeProfit
     Assumes takeProfit is a positive delta (not an absolute price).
  */
  let manipulateClosePrice: number | undefined = undefined;
  if (Number.isFinite(takeProfit) && (takeProfit as number) > 0) {
    const tpDelta = takeProfit as number;
    const raw = side === "buy" ? entryPrice + tpDelta : entryPrice - tpDelta;
    const rounded = roundToTick(raw, tick);
    manipulateClosePrice =
      Number.isFinite(rounded) && rounded > 0
        ? +rounded.toFixed(spec.digits)
        : undefined;
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
    entryPrice,
    margin: 0,
    commissionOpen,
    status: "open",
    openedAt: new Date(),
    takeProfit,
    manipulateClosePrice,
  });

  emitPositionOpened(pos, "market");

  acc.balance = round((acc.balance ?? 0) - commissionOpen, 2);
  acc.equity = acc.balance;
  await acc.save();

  /* ────────── web push (user): position opened ────────── */
  try {
    await sendPushToUser(String(user._id), {
      title: "Position Opened",
      body: `${symbol} ${side.toUpperCase()} • ${lots} lot${
        lots > 1 ? "s" : ""
      } @ ${entryPrice.toFixed(spec.digits)}`,
      url: `/ai-trade/${pos._id}`,
      tag: "ai-position-opened",
      renotify: false,
    });
  } catch {}

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
      manipulateClosePrice,
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
    }).sort({ closedAt: -1 });
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

  // Broadcast close event
  if ((global as any).io) {
    (global as any).io.emit("position:closed", {
      _id: String(pos._id),
      symbol: pos.symbol,
      side: pos.side,
      closePrice: pos.closePrice,
      pnl: pos.pnl,
      takeProfit: pos.takeProfit,
      reason: "takeProfit_usd_ws",
      closedBy: "admin",
    });
  }

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

/* ── Get all active AI Account and is_active_aiTrade = true for all users ───────────────────────────────── */
export const getAllAiAccountsForAllUsers: typeHandler = catchAsync(
  async (req, res) => {
    const items = await Account.find({ status: "active" }).sort({
      isDefault: -1,
      createdAt: 1,
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const user = await User.findById(item.userId);
      if (user) {
        if (!user.is_active_aiTrade) {
          console.log(
            `❌ User ${user.name} is not active aiTrade, skipping...`
          );
          user.is_active_aiTrade = true;
          await user.save();
        }
      }
    }

    res.json({ success: true, totalItems: items.length });
  }
);

/* ── Get all active AiPositions by plan for users  ───────────────────────────── */
export const getActiveAiPositionsByPlanForUser: typeHandler = catchAsync(
  async (req, res) => {
    const { plan } = req.query as { plan: string };
    const positions = await AiPosition.find({
      status: "open",
      plan,
    });

    res.status(200).json({ success: true, items: positions });
  }
);
