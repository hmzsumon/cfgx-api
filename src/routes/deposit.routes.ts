import {
  createDepositWithBlockBee,
  getAllDepositsForAdmin,
  getDepositByIdForAdmin,
  getMyDeposits,
  handleBlockBeeCallback,
  testSocketConnection,
} from "@/controllers/deposit.controller";
import { authorizeRoles, isAuthenticatedUser } from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

// create deposit with BlockBee
router.post(
  "/create-new-deposit",
  isAuthenticatedUser,
  createDepositWithBlockBee
);

// BlockBee callback route
router.get("/callback/:id", handleBlockBeeCallback);

// get my deposits
router.get("/my-deposits", isAuthenticatedUser, getMyDeposits);

// test socket connection
router.get(
  "/test-socket-connection",
  isAuthenticatedUser,
  testSocketConnection
);

// get all deposits for admin
router.get(
  "/admin/all-deposits",
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getAllDepositsForAdmin
);

// get deposit by id for admin
router.get(
  "/admin/deposit/:depositId",
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getDepositByIdForAdmin
);

export default router;
