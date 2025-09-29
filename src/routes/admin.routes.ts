import {
	initialSetup,
	checkUtilityFunction,
	updateAllUsersTaskReport,
	adminLogin,
	getAdminDashboardSummary,
	getAllUsers,
	getUserById,
	resetDailyTasks,
	createPaymentMethod,
} from '@/controllers/admin.controller';
import { isAuthenticatedUser, authorizeRoles } from '@/middlewares/auth';
import { Router } from 'express';

const router = Router();

// initialize setup
router.post('/initial-setup', initialSetup);

// admin login
router.post('/admin/login', adminLogin);

// check utility function
router.post('/check-utility-function', checkUtilityFunction);

// update all users task report
router.put('/update-all-users-task-report', updateAllUsersTaskReport);

// get admin dashboard summary
router.get(
	'/admin/dashboard-summary',
	isAuthenticatedUser,
	authorizeRoles('admin'),
	getAdminDashboardSummary
);

// get all users
router.get(
	'/admin/users',
	isAuthenticatedUser,
	authorizeRoles('admin'),
	getAllUsers
);

// get user by ID
router.get(
	'/admin/user/:id',
	isAuthenticatedUser,
	authorizeRoles('admin'),
	getUserById
);

// reset daily tasks
router.put(
	'/admin/reset-daily-tasks',
	isAuthenticatedUser,
	authorizeRoles('admin'),
	resetDailyTasks
);

/* ────────── Payment Methods ────────── */
router.post('/admin/payment-methods', createPaymentMethod);

export default router;
