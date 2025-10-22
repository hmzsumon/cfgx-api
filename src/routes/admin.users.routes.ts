/* ────────── imports ────────── */
import {
  getAllUsersPaginated,
  getUserByIdWithWallet,
  getUserTransactionsPaginated,
} from "@/controllers/admin.users.controller";
import { authorizeRoles, isAuthenticatedUser } from "@/middlewares/auth";
import { Router } from "express";

/* ────────── router ────────── */
const router = Router();

/* ────────── Admin Users listing ────────── */
router.get(
  "/admin/users",
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getAllUsersPaginated
);

/* ────────── details ────────── */
router.get(
  "/admin/users/:id",
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getUserByIdWithWallet
);

/* ────────── transactions ────────── */
router.get(
  "/admin/users/:id/transactions",
  isAuthenticatedUser,
  authorizeRoles("admin"),
  getUserTransactionsPaginated
);

export default router;
