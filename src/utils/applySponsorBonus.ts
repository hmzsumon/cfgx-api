import { Types } from 'mongoose';
import TransactionManager from '@/utils/TransactionManager';
import { User } from '@/models/user.model';
import UserWallet from '@/models/UserWallet.model';

interface ApplySponsorBonusOptions {
	userName: string;
	sponsorId: Types.ObjectId;
	amount: number;
}

export const applySponsorBonus = async ({
	userName,
	sponsorId,
	amount,
}: ApplySponsorBonusOptions): Promise<void> => {
	try {
		if (amount < 100) return;

		const sponsor = await User.findById(sponsorId);
		if (!sponsor) {
			console.error(`Sponsor not found for user ${userName}`);
			return;
		}

		// Check if sponsor is active
		if (!sponsor.is_active) {
			console.error(`Sponsor ${sponsor.customerId} is not active.`);
			return;
		}

		// Update sponsor's m_balance with 5% bonus
		const bonus = amount * 0.05;
		sponsor.m_balance += bonus;
		await sponsor.save();

		// get sponsor wallet and update total bonus
		const wallet = await UserWallet.findOne({ userId: sponsor._id });
		if (!wallet) {
			console.error(`Wallet not found for sponsor ${sponsor.customerId}`);
			return;
		}

		wallet.totalEarning = (wallet.totalEarning ?? 0) + bonus;
		wallet.todayEarning = (wallet.todayEarning ?? 0) + bonus;
		wallet.thisMonthEarning = (wallet.thisMonthEarning ?? 0) + bonus;
		wallet.totalSponsorBonus = (wallet.totalSponsorBonus ?? 0) + bonus;
		await wallet.save();

		// Create 10% cash-in transaction for sponsor
		const txManager = new TransactionManager();
		await txManager.createTransaction({
			userId: (sponsor._id as Types.ObjectId).toString(),
			customerId: sponsor.customerId,
			transactionType: 'cashIn',
			amount: bonus,
			purpose: 'Deposit Bonus',
			description: `You received a deposit bonus of ${bonus.toFixed(
				2
			)} USDT from ${userName}'s deposit.`,
		});
	} catch (error) {
		console.error('🔴 Failed to apply sponsor bonus:', error);
	}
};
