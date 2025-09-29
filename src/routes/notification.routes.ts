import { isAuthenticatedUser, authorizeRoles } from '@/middlewares/auth';
import { Router } from 'express';

const router = Router();

import {
	getMyUnreadNotificationsCount,
	getMyUnreadNotifications,
	updateNotificationIsRead,
	getAdminNotifications,
	updateAdminNotificationIsRead,
} from '@/controllers/notification.controller';

// get my unread notifications count
router.get(
	'/my-unread-notifications-count',
	isAuthenticatedUser,
	getMyUnreadNotificationsCount
);

// get my all unread notifications
router.get(
	'/my-unread-notifications',
	isAuthenticatedUser,
	getMyUnreadNotifications
);

// update notification status to read
router.put(
	'/update-notification/:id',
	isAuthenticatedUser,
	updateNotificationIsRead
);

// get admin notifications
router.get(
	'/admin-notifications',
	isAuthenticatedUser,
	authorizeRoles('admin'),
	getAdminNotifications
);

// routes/notification.route.ts
router.put(
	'/update-admin-notification',
	isAuthenticatedUser,
	authorizeRoles('admin'),
	updateAdminNotificationIsRead
);

export default router;
