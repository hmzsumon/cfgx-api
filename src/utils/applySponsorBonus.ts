import { User } from "@/models/user.model";
import UserTeamSummary from "@/models/UserTeamSummary.model";
import UserWallet from "@/models/UserWallet.model";
import TransactionManager from "@/utils/TransactionManager";
import { Types } from "mongoose";

interface ApplySponsorBonusOptions {
  userName: string;
  sponsorId: Types.ObjectId;
  amount: number;
  plan: string;
}

export const applySponsorBonus = async ({
  userName,
  sponsorId,
  amount,
  plan,
}: ApplySponsorBonusOptions): Promise<void> => {
  try {
    const sponsor = await User.findById(sponsorId);
    if (!sponsor) {
      console.error(`Sponsor not found for user ${userName}`);
      return;
    }

    /* ────────── Check if sponsor is active ai trade ────────── */
    if (!sponsor.is_active_aiTrade) {
      console.error(`Sponsor ${sponsor.customerId} is not active.`);
      return;
    }

    /* ────────── calculate sponsor bonus if amount < 100 = 2USDT or > 100 5 usdt ────────── */
    let bonus = 0;
    if (amount < 100) {
      bonus = 2;
    } else {
      bonus = 5;
    }

    /* ────────── Apply sponsor bonus ────────── */
    sponsor.m_balance += bonus;
    await sponsor.save();

    /* ────────── Update sponsor wallet ────────── */
    const wallet = await UserWallet.findOne({ userId: sponsor._id });
    if (!wallet) {
      console.error(`Wallet not found for sponsor ${sponsor.customerId}`);
      return;
    }

    wallet.totalEarning = (wallet.totalEarning ?? 0) + bonus;
    wallet.todayEarning = (wallet.todayEarning ?? 0) + bonus;
    wallet.thisMonthEarning = (wallet.thisMonthEarning ?? 0) + bonus;
    wallet.totalReferralBonus = (wallet.totalReferralBonus ?? 0) + bonus;
    await wallet.save();

    /* ────────── get Team and Update sponsor wallet ────────── */
    const userTeam = await UserTeamSummary.findOne({
      userId: sponsor._id,
    }).select("totalReferralBonus");
    if (!userTeam) {
      console.error(`Team not found for sponsor ${sponsor.customerId}`);
      return;
    }

    userTeam.totalReferralBonus = (userTeam.totalReferralBonus ?? 0) + bonus;
    await userTeam.save();

    /* ────────── Create 10% cash-in transaction for sponsor ────────── */
    const txManager = new TransactionManager();
    await txManager.createTransaction({
      userId: (sponsor._id as Types.ObjectId).toString(),
      customerId: sponsor.customerId,
      transactionType: "cashIn",
      amount: bonus,
      purpose: "Referral Bonus",
      description: `You have received a referral bonus of ${bonus.toFixed(
        2
      )}$ from ${userName}'s Ai plan ${plan} Trade.`,
    });

    // console.log(
    //   `Sponsor ${
    //     sponsor.customerId
    //   } has received a referral bonus of ${bonus.toFixed(
    //     2
    //   )}$ from ${userName}'s Ai plan ${plan}.`
    // );
  } catch (error) {
    console.error("🔴 Failed to apply sponsor bonus:", error);
  }
};
