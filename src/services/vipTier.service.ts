// ✅ services/vipTier.service.ts
import { startSession, Types } from 'mongoose';
import { User } from '@/models/user.model';
import Team from '@/models/UserTeamSummary.model';
import VipTierLog from '@/models/VipTierLog.model';
import TireProfitRate, {
	ITireProfitRate,
	TireProfitRateValues,
} from '@/models/TireProfitRate.model';
import TaskReport from '@/models/TaskReport.model';

interface VipTierConfig {
	name: keyof TireProfitRateValues;
	requirements: {
		activeTeamMembers: number;
		balance: number;
	};
}

const vipTierConfig: VipTierConfig[] = [
	{ name: 'VIP1', requirements: { activeTeamMembers: 0, balance: 30 } },
	{ name: 'VIP2', requirements: { activeTeamMembers: 5, balance: 500 } },
	{ name: 'VIP3', requirements: { activeTeamMembers: 10, balance: 2000 } },
	{ name: 'VIP4', requirements: { activeTeamMembers: 15, balance: 5000 } },
	{ name: 'VIP5', requirements: { activeTeamMembers: 50, balance: 10000 } },
	{ name: 'VIP6', requirements: { activeTeamMembers: 100, balance: 20000 } },
];

type VipKey = keyof TireProfitRateValues;

export const checkAndUpdateVipTier = async (
	userId: string
): Promise<string> => {
	const [user, team, profitRateDoc, taskReport] = await Promise.all([
		User.findById(userId).select('m_balance vipTier customerId').lean(),
		Team.findOne({ userId }).lean(),
		TireProfitRate.findOne().lean(),
		TaskReport.findOne({ userId }),
	]);

	if (!user || !team || !profitRateDoc) return 'VIP0';

	const balance = user.d_balance ?? 0;

	const allMemberIds = [
		...(team.level_1?.users ?? []),
		...(team.level_2?.users ?? []),
		...(team.level_3?.users ?? []),
	].filter(Types.ObjectId.isValid);

	const totalActiveTeamMembers = await User.countDocuments({
		_id: { $in: allMemberIds },
		m_balance: { $gte: 100 },
	});

	const highestTier =
		[...vipTierConfig]
			.reverse()
			.find(
				(t) =>
					balance >= t.requirements.balance &&
					totalActiveTeamMembers >= t.requirements.activeTeamMembers
			)?.name || 'VIP0';

	const rateMap = profitRateDoc as ITireProfitRate;
	const vipRate = rateMap[highestTier as VipKey] ?? 0;
	const taskValue = (balance * vipRate) / 3;

	const changes =
		user.vipTier !== highestTier || taskReport?.taskValue !== taskValue;
	if (!changes) return highestTier;

	const session = await startSession();
	try {
		await session.withTransaction(async () => {
			await User.updateOne(
				{ _id: userId },
				{ $set: { vipTier: highestTier } },
				{ session }
			);

			if (taskReport) {
				await TaskReport.updateOne(
					{ _id: taskReport._id },
					{ $set: { vipTier: highestTier, taskValue, isActive: true } },
					{ session }
				);
			}

			await VipTierLog.findOneAndUpdate(
				{ userId },
				{
					userId,
					customerId: user.customerId,
					vipTier: highestTier,
					lastVipTier: user.vipTier ?? 'VIP0',
				},
				{ upsert: true, new: true, session }
			);
		});
	} finally {
		session.endSession();
	}

	return highestTier;
};
