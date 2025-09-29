import { typeHandler } from '@/types/express';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';
import { User } from '@/models/user.model';
import { Notification } from '@/models/Notification.model';
import { AdminNotification } from '@/models/AdminNotification.model';

// get my unread notifications count
export const getMyUnreadNotificationsCount: typeHandler = catchAsync(
	async (req, res, next) => {
		const userId = req.user?._id;

		if (!userId) {
			return next(new ApiError(401, 'User not authenticated'));
		}

		const user = await User.findById(userId);
		if (!user) {
			return next(new ApiError(404, 'User not found'));
		}
		const unreadNotificationsCount = await Notification.countDocuments({
			user_id: userId,
			is_read: false,
		});

		res.status(200).json({
			success: true,
			dataCount: unreadNotificationsCount,
			message: 'Unread notifications count retrieved successfully',
		});
	}
);

// get my all unread admin notifications
export const getMyUnreadNotifications: typeHandler = catchAsync(
	async (req, res, next) => {
		const userId = req.user?._id;

		if (!userId) {
			return next(new ApiError(401, 'User not authenticated'));
		}

		const user = await User.findById(userId);
		if (!user) {
			return next(new ApiError(404, 'User not found'));
		}

		const notifications = await Notification.find({
			user_id: userId,
			is_read: false,
		}).sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			notifications,
			message: 'Unread notifications retrieved successfully',
		});
	}
);

// update notification status to read
export const updateNotificationIsRead: typeHandler = catchAsync(
	async (req, res, next) => {
		const userId = req.user?._id;
		const notificationId = req.params.id;
		console.log('Notification ID:', notificationId);
		if (!userId) {
			return next(new ApiError(401, 'User not authenticated'));
		}

		const notification = await Notification.findOneAndUpdate(
			{ _id: notificationId, user_id: userId },
			{ is_read: true },
			{ new: true }
		);

		if (!notification) {
			return next(new ApiError(404, 'Notification not found'));
		}

		res.status(200).json({
			success: true,
			message: 'Notification marked as read successfully',
			data: notification,
		});
	}
);

// get admin notifications
export const getAdminNotifications: typeHandler = catchAsync(
	async (req, res, next) => {
		const userId = req.user?._id;

		if (!userId) {
			return next(new ApiError(401, 'User not authenticated'));
		}

		const user = await User.findById(userId);
		if (!user) {
			return next(new ApiError(404, 'User not found'));
		}

		const notifications = await AdminNotification.find({
			is_read: false,
		}).sort({
			createdAt: -1,
		});
		res.status(200).json({
			success: true,
			notifications,
			message: 'Admin notifications retrieved successfully',
		});
	}
);

// update admin notification status to read
// controllers/notification.controller.ts
export const updateAdminNotificationIsRead: typeHandler = catchAsync(
	async (req, res, next) => {
		const userId = req.user?._id;
		const { notificationIds } = req.body;

		if (!userId) return next(new ApiError(401, 'User not authenticated'));

		await AdminNotification.updateMany(
			{ _id: { $in: notificationIds }, is_read: false },
			{ $set: { is_read: true } }
		);

		res.status(200).json({
			success: true,
			message: 'Admin notifications marked as read.',
		});
	}
);
