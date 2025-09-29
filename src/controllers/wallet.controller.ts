import { typeHandler } from '@/types/express';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';
import { User } from '@/models/user.model';

// send money
export const sendMoney: typeHandler = catchAsync(async (req, res, next) => {
	const user = req.user;
	const amount = 20;
	if (!user || !user._id) {
		return next(new ApiError(401, 'User not authenticated'));
	}

	// update sender balance
	user.m_balance -= amount;
	await user.save();

	res.status(200).json({
		success: true,
		message: 'Money sent successfully',
	});
});
