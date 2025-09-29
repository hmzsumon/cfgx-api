import { isAuthenticatedUser } from '@/middlewares/auth';
import { Router } from 'express';
import {
	getMyRankSummary,
	getTaskCenterData,
} from '@/controllers/rank.controller';
const router = Router();

// get my rank summary
router.get('/my-rank-summary', isAuthenticatedUser, getMyRankSummary);
// get task center data
router.get('/task-center-data', isAuthenticatedUser, getTaskCenterData);

export default router;
