/* ──────────────────────────────────────────────────────────────────────────
   Account Routes
────────────────────────────────────────────────────────────────────────── */
import {
  closeAiPosition,
  createAiAccount,
  getActiveAiPositions,
  getActiveAiPositionsForUser,
  getAllAiAccounts,
  getAllAiAccountsForAdmin,
  getClosedAiPositionsForUser,
  myAiAccounts,
  placeAiMarketOrder,
} from "@/controllers/aiAccount.controller";
import { isAuthenticatedUser } from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

router.post("/create-ai-accounts", isAuthenticatedUser, createAiAccount);
router.get("/my-ai-accounts", isAuthenticatedUser, myAiAccounts);
router.get("/all-active-ai-accounts", isAuthenticatedUser, getAllAiAccounts);
router.get(
  "/all-ai-accounts-for-admin",
  isAuthenticatedUser,
  getAllAiAccountsForAdmin
);

router.post("/place-order-ai-trade", isAuthenticatedUser, placeAiMarketOrder);

router.get(
  "/all-active-ai-positions",
  isAuthenticatedUser,
  getActiveAiPositions
);

router.post("/close-ai-position/:id", isAuthenticatedUser, closeAiPosition);

router.get(
  "/get-active-ai-positions-for-user",
  isAuthenticatedUser,
  getActiveAiPositionsForUser
);

router.get(
  "/get-closed-ai-positions-for-user",
  isAuthenticatedUser,
  getClosedAiPositionsForUser
);

export default router;
