/* ──────────────────────────────────────────────────────────────────────────
   Account Controller — create/list/update/default/transfer/close
────────────────────────────────────────────────────────────────────────── */
import { ACCOUNT_TYPES, TAccountType } from "@/config/accountTypes";
import Account from "@/models/Account.model";
import DemoTopUpModel from "@/models/DemoTopUp.model";
import { User } from "@/models/user.model";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { generateAccountNumber } from "@/utils/generateAccountNumber";
// যদি আপনার লেজার/ট্রান্স্যাকশন ম্যানেজার থাকে, এখানে ইম্পোর্ট করুন
// import { createDoubleEntry } from "@/utils/TransactionManager";

function assertAllowedLeverage(t: TAccountType, lv: number) {
  const ok = ACCOUNT_TYPES[t].allowedLeverages.includes(lv);
  if (!ok)
    throw new ApiError(400, "Leverage not allowed for this account type");
}

export const createAccount: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  const { type, leverage, name, currency, mode } = req.body as {
    type: TAccountType;
    leverage?: number;
    name?: string;
    currency?: "USD" | "BDT";
    mode?: "demo" | "real";
  };
  if (!type || !ACCOUNT_TYPES[type])
    throw new ApiError(400, "Invalid account type");

  // per-user limit
  const countSame = await Account.countDocuments({
    userId,
    type,
    status: "active",
  });
  if (countSame >= ACCOUNT_TYPES[type].maxAccountsPerUser) {
    throw new ApiError(400, "Maximum active accounts reached for this type");
  }

  const lv = leverage ?? ACCOUNT_TYPES[type].defaultLeverage;
  assertAllowedLeverage(type, lv);

  const accountNumber = await generateAccountNumber();

  // যদি প্রথম অ্যাকাউন্ট হয়, default true
  const hasAny = await Account.exists({ userId, status: "active" });
  const acc = await Account.create({
    userId,
    customerId: user.customerId,
    accountNumber,
    type,
    name,
    currency: currency ?? "USD",
    leverage: lv,
    isDefault: !hasAny,
    mode: mode === "demo" ? "demo" : "real",
    meta: {
      commissionPerLot: ACCOUNT_TYPES[type].commissionPerLot,
      minSpreadPips: ACCOUNT_TYPES[type].minSpreadPips,
    },
  });

  res.status(201).json({ success: true, account: acc });
});

export const myAccounts: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const items = await Account.find({ userId, status: "active" }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  res.json({ success: true, items });
});

export const setDefault: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { id } = req.params;

  const acc = await Account.findOne({ _id: id, userId, status: "active" });
  if (!acc) throw new ApiError(404, "Account not found");

  await Account.updateMany({ userId }, { $set: { isDefault: false } });
  acc.isDefault = true;
  await acc.save();

  res.json({ success: true, account: acc });
});

export const updateAccount: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { name, leverage } = req.body as { name?: string; leverage?: number };

  const acc = await Account.findOne({ _id: id, userId, status: "active" });
  if (!acc) throw new ApiError(404, "Account not found");

  if (leverage) {
    assertAllowedLeverage(acc.type, leverage);
    acc.leverage = leverage;
  }
  if (typeof name === "string") acc.name = name;

  await acc.save();
  res.json({ success: true, account: acc });
});

/* Internal fund transfer between main wallet ↔ account balance
   direction: "fund" (wallet→account) or "defund" (account→wallet)
   NOTE: এখানে আপনার Wallet model/TransactionManager কল বসান।
*/
export const transferInternal: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { direction, amount } = req.body as {
    direction: "fund" | "defund";
    amount: number;
  };

  if (!["fund", "defund"].includes(direction))
    throw new ApiError(400, "Invalid direction");
  if (!amount || amount <= 0) throw new ApiError(400, "Invalid amount");

  const acc = await Account.findOne({ _id: id, userId, status: "active" });
  if (!acc) throw new ApiError(404, "Account not found");

  // TODO: এখানে wallet balance ফেচ করে ভ্যালিডেট করুন
  // const wallet = await UserWallet.findOne({ userId });

  if (direction === "fund") {
    // if (wallet.balance < amount) throw new ApiError(400, "Insufficient wallet balance");
    acc.balance += amount;
    // wallet.balance -= amount;
  } else {
    if (acc.balance < amount)
      throw new ApiError(400, "Insufficient account balance");
    acc.balance -= amount;
    // wallet.balance += amount;
  }

  // await Promise.all([acc.save(), wallet.save()]);
  await acc.save();

  // Optional: Double-entry ledger
  // await createDoubleEntry({ userId, amount, from: direction==="fund"?"wallet":"account", to: direction==="fund"?"account":"wallet", refId: acc._id });

  res.json({ success: true, account: acc });
});

export const closeAccount: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { id } = req.params;

  const acc = await Account.findOne({ _id: id, userId, status: "active" });
  if (!acc) throw new ApiError(404, "Account not found");

  // PROTECT: balance must be 0 and (optionally) no open positions
  if (acc.balance !== 0)
    throw new ApiError(400, "Balance must be zero before closing");
  // TODO: যদি OMS থাকে, open positions চেক করুন

  acc.status = "closed";
  acc.isDefault = false;
  await acc.save();

  // যদি default ছিল, অন্য কোনো active account কে default করুন
  const another = await Account.findOne({ userId, status: "active" }).sort({
    createdAt: 1,
  });
  if (another) {
    another.isDefault = true;
    await another.save();
  }

  res.json({ success: true });
});

/* ──────────────────────────────────────────────────────────────────────────
   Demo deposit (top-up) — ONLY for demo accounts
────────────────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────────
   Demo deposit (top-up) — ONLY for demo accounts
   - balance += amount
   - equity  += amount  ← VERY IMPORTANT
   - marginUsed অপরিবর্তিত থাকবে
────────────────────────────────────────────────────────────────────────── */
export const demoDeposit: typeHandler = catchAsync(async (req, res) => {
  const userId = req.user!._id;
  const { id } = req.params; // account id
  const { amount } = req.body as { amount: number };

  if (typeof amount !== "number" || isNaN(amount)) {
    throw new ApiError(400, "Invalid amount");
  }
  if (amount <= 0) throw new ApiError(400, "Amount must be greater than 0");
  if (amount > 1e10) throw new ApiError(400, "Amount too large");

  const acc = await Account.findOne({ _id: id, userId, status: "active" });
  if (!acc) throw new ApiError(404, "Account not found");
  if (acc.mode !== "demo") {
    throw new ApiError(400, "Only demo accounts support instant deposit");
  }

  // ✅ balance ও equity—দুটোই বাড়বে
  acc.balance = (acc.balance ?? 0) + amount;
  acc.equity = (acc.equity ?? acc.balance ?? 0) + amount; // equity নাল হলে balance ধরে নিলাম
  // marginUsed অপরিবর্তিত
  await acc.save();

  // audit (ঐচ্ছিক)
  await DemoTopUpModel.create({
    userId,
    accountId: acc._id,
    amount,
    currency: acc.currency,
    status: "accepted",
  });

  res.status(200).json({
    success: true,
    account: acc,
    receipt: { status: "accepted", amount, currency: acc.currency },
  });
});
