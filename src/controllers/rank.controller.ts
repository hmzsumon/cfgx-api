import { typeHandler } from '@/types/express';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';
import { User } from '@/models/user.model';
import UserTeam from '@/models/UserTeamSummary.model';
import UserRankSummary from '@/models/UserRankSummary.model';
import UserWallet from '@/models/UserWallet.model';

// get my rank summary
export const getMyRankSummary = catchAsync(async (req, res) => {
	const userId = req.user?._id;

	if (!userId) {
		throw new ApiError(400, 'User ID is required');
	}

	// get user details
	const user = await User.findById(userId);
	if (!user) {
		throw new ApiError(404, 'User not found');
	}

	//get UserTeam by userId
	const userTeam = await UserTeam.findOne({ userId });
	if (!userTeam) {
		throw new ApiError(404, 'User team not found');
	}

	// wallet details
	const userWallet = await UserWallet.findOne({ userId });
	if (!userWallet) {
		throw new ApiError(404, 'User wallet not found');
	}

	const userRankSummary = await UserRankSummary.findOne({ userId });
	if (!userRankSummary) {
		throw new ApiError(404, 'User rank summary not found');
	}

	const userRankData = {
		userId: user._id,
		directMembers: userTeam.level_1.activeUsers,
		activeMembers: userTeam.teamActiveMember,
		totalEarnings: userWallet.totalEarning,
		teamDeposits: userTeam.totalTeamActiveDeposit,
	};

	res.status(200).json({
		status: 'success',
		rankData: userRankData,
	});
});

// get task-center data
export const getTaskCenterData = catchAsync(async (req, res) => {
	const userId = req.user?._id;

	if (!userId) {
		throw new ApiError(400, 'User ID is required');
	}

	// get user details
	const user = await User.findById(userId);
	if (!user) {
		throw new ApiError(404, 'User not found');
	}

	//get UserTeam by userId
	const userTeam = await UserTeam.findOne({ userId });
	if (!userTeam) {
		throw new ApiError(404, 'User team not found');
	}

	// wallet details
	const userWallet = await UserWallet.findOne({ userId });
	if (!userWallet) {
		throw new ApiError(404, 'User wallet not found');
	}

	const userRankSummary = await UserRankSummary.findOne({ userId });
	if (!userRankSummary) {
		throw new ApiError(404, 'User rank summary not found');
	}

	const userRankData = {
		totalMembers: userTeam.totalTeamMember,
		activeMembers: userTeam.teamActiveMember,
		level_1Members: userTeam.level_1.users.length,
		level_2Members: userTeam.level_2.users.length,
		level_3Members: userTeam.level_3.users.length,
		totalEarnings: userWallet.totalEarning,
	};

	res.status(200).json({
		status: 'success',
		taskCenterData: userRankData,
	});
});
