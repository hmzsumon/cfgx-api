import { isAuthenticatedUser } from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

/* ────────── Get All Agents ────────── */
import {
  createAgentStatusForAllAgents,
  getAllAgents,
} from "@/controllers/agent.controller";

router.get("/agents", isAuthenticatedUser, getAllAgents);
/* ────────── Create AgentStatus for all agent ────────── */
router.post(
  "/agents/create-status",

  createAgentStatusForAllAgents
);

export default router;
