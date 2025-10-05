/* ── autoCloseDistributor (per-account user & parents split; + transactions) ─ */

import AiAccount from "@/models/AiAccount.model";
import AiPosition from "@/models/AiPosition.model";
import SystemStats from "@/models/SystemStats.model";
import { User } from "@/models/user.model";
import TransactionManager from "@/utils/TransactionManager";
import mongoose from "mongoose";

/* ── constants ───────────────────────────────────────────── */
const PCT_USER = 0.6; // 60% to end user (per account)
const PCT_COMPANY = 0.1; // 10% to company income.aiTradeCharge (per account)
const PCT_PARENTS = 0.3; // 30% to parents pool (per account)

/* parents split by index (0..4): 30%, 25%, 20%, 15%, 10% ─ sum=100% */
const PARENTS_SPLIT = [0.3, 0.25, 0.2, 0.15, 0.1];
const LEVEL_LABELS = ["A", "B", "C", "D", "E"];

/* ── tiny helpers ───────────────────────────────────────── */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => n.toFixed(2);

/* ── short, English messages ────────────────────────────── */
const msgUser = (custId: string, amt: number) =>
  `AI trade profit credited: ${fmt(amt)} USDT. (ID: ${custId})`;

const msgParent = (childCustId: string, label: string, amt: number) =>
  `Level ${label} commission from ${childCustId}: ${fmt(amt)} USDT.`;

/* ── main: distribute & replicate using EACH account's user & parents ───── */
export async function distributeOnAutoCloseSimple(posId: string) {
  /* ── load source closed position ───────────────────────── */
  const pos = await AiPosition.findById(posId).lean();
  if (!pos) throw new Error("Position not found");
  if (pos.status !== "closed") throw new Error("Position is not closed yet");
  if (!pos.plan) throw new Error("Missing position.plan");

  /* ── idempotency guard ─────────────────────────────────── */
  const guard = await AiPosition.updateOne(
    { _id: pos._id, distributedAt: { $exists: false } as any },
    { $set: { distributedAt: new Date() } }
  ).exec();
  if (guard.modifiedCount === 0) return { ok: true, skipped: true };

  /* ── base amount from takeProfit ───────────────────────── */
  const baseRaw = Number(pos.takeProfit ?? 0);
  if (!(baseRaw > 0))
    return { ok: true, skipped: true, reason: "no_takeProfit" };
  const base = round2(baseRaw);

  /* ── load all active user accounts for this plan ───────── */
  const accounts = await AiAccount.find({
    plan: pos.plan,
    status: "active",
    role: "user",
  })
    .select({ _id: 1, userId: 1, customerId: 1 })
    .lean();

  if (accounts.length === 0) {
    return { ok: true, skipped: true, reason: "no_accounts" };
  }

  /* ── prebuild cloned closed positions (one per account) ── */
  const clones = accounts.map((acc) => ({
    accountId: acc._id,
    userId: acc.userId,
    customerId: acc.customerId,
    symbol: pos.symbol,
    side: pos.side,
    lots: pos.lots,
    contractSize: pos.contractSize ?? 1,
    entryPrice: pos.entryPrice,
    margin: pos.margin ?? 0,
    commissionOpen: pos.commissionOpen ?? 0,
    commissionClose: pos.commissionClose ?? 0,
    status: "closed" as const,
    openedAt: pos.openedAt ?? new Date(),
    closedAt: new Date(),
    closePrice: pos.closePrice,
    pnl: pos.pnl,
    takeProfit: pos.takeProfit,
    stopLoss: pos.stopLoss,
    plan: pos.plan,
    planPrice: pos.planPrice,
  }));

  /* ── bulk insert cloned positions ──────────────────────── */
  await AiPosition.insertMany(clones);

  /* ── compute per-account amounts ───────────────────────── */
  const perUserAmt = round2(base * PCT_USER);
  const perParentsPool = round2(base * PCT_PARENTS);
  const perCompanyAmt = round2(base * PCT_COMPANY);

  /* ── fetch users (parents + customerId) once ───────────── */
  const userIds = [...new Set(accounts.map((a) => String(a.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select({ parents: 1, customerId: 1 })
    .lean();

  /* ── build quick maps ──────────────────────────────────── */
  const parentsMap = new Map<string, mongoose.Types.ObjectId[]>();
  const custIdMap = new Map<string, string>();
  for (const u of users) {
    parentsMap.set(String(u._id), (u.parents || []) as any);
    custIdMap.set(String(u._id), u.customerId || "");
  }

  /* ── aggregate balance increments ──────────────────────── */
  const selfIncs = new Map<string, number>();
  const parentIncs = new Map<string, number>();

  /* ── collect transactions to create (user + parents) ───── */
  const txManager = new TransactionManager();
  const txPromises: Promise<any>[] = [];

  for (const acc of accounts) {
    const uid = String(acc.userId);
    const childCustId = acc.customerId || custIdMap.get(uid) || "";

    /* ── self 60% ────────────────────────────────────────── */
    selfIncs.set(uid, round2((selfIncs.get(uid) || 0) + perUserAmt));

    /* ── user transaction: Ai Trade Profit ───────────────── */
    txPromises.push(
      txManager.createTransaction({
        userId: uid,
        customerId: childCustId,
        transactionType: "cashIn",
        amount: perUserAmt,
        purpose: "Ai Trade Profit",
        description: msgUser(childCustId, perUserAmt),
      })
    );

    /* ── parents 30% split (index 0..4 => 30/25/20/15/10) ── */
    const parents = parentsMap.get(uid) || [];
    if (parents.length > 0) {
      const max = Math.min(5, parents.length);

      // If fewer than 5 parents, normalize the partial weights to 100%
      const pctSum =
        PARENTS_SPLIT.slice(0, max).reduce((a, b) => a + b, 0) || 1;

      for (let i = 0; i < max; i++) {
        const pid = String(parents[i]);
        const pct = PARENTS_SPLIT[i] / pctSum;
        const amt = round2(perParentsPool * pct);

        parentIncs.set(pid, round2((parentIncs.get(pid) || 0) + amt));

        // parent transaction: Ai Trade Commission
        const label = LEVEL_LABELS[i] ?? `L${i + 1}`;
        txPromises.push(
          txManager.createTransaction({
            userId: pid,
            customerId: "", // optionally fetch and pass parent's own customerId
            transactionType: "cashIn",
            amount: amt,
            purpose: "Ai Trade Commission",
            description: msgParent(childCustId, label, amt),
          })
        );
      }
    }
  }

  /* ── apply self credits (bulkWrite) ────────────────────── */
  if (selfIncs.size > 0) {
    const ops = Array.from(selfIncs.entries()).map(([id, amt]) => ({
      updateOne: { filter: { _id: id }, update: { $inc: { m_balance: amt } } },
    }));
    await User.bulkWrite(ops);
  }

  /* ── apply parent credits (bulkWrite) ──────────────────── */
  if (parentIncs.size > 0) {
    const ops = Array.from(parentIncs.entries()).map(([id, amt]) => ({
      updateOne: { filter: { _id: id }, update: { $inc: { m_balance: amt } } },
    }));
    await User.bulkWrite(ops);
  }

  /* ── apply company income (10% per account, once) ──────── */
  const companyTotal = round2(perCompanyAmt * accounts.length);
  await SystemStats.updateOne(
    {},
    { $inc: { "income.aiTradeCharge": companyTotal } },
    { upsert: true }
  ).exec();

  /* ── create all transactions ───────────────────────────── */
  if (txPromises.length) {
    await Promise.all(txPromises);
  }

  return {
    ok: true,
    skipped: false,
    replicated: clones.length,
    perUserAmt,
    perParentsPool,
    companyTotal,
    usersAffected: selfIncs.size,
    parentsAffected: parentIncs.size,
    txCount: txPromises.length,
  };
}
