import { AdminNotification } from "@/models/AdminNotification.model";
import AgentStatus from "@/models/AgentStatus.model";
import { Notification } from "@/models/Notification.model";
import SystemStats from "@/models/SystemStats.model";
import { User } from "@/models/user.model";
import UserWallet from "@/models/UserWallet.model";
import UserWithdrawSummary from "@/models/UserWithdrawSummary.model";
import Withdraw from "@/models/Withdraw.model";
import { sendEmail } from "@/services/email/emailService";
import { withdrawApprovalTemplate } from "@/services/email/templates/withdrawtemplate";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import TransactionManager from "@/utils/TransactionManager";
import updateTeamWithdraw from "@/utils/updateTeamWithdraw";

const WITHDRAW_CHARGE = 0.05; // 5%

/* ── Create New Withdraw Request ───────────────────────────────── */
export const newWithdrawRequest: typeHandler = catchAsync(
  async (req, res, next) => {
    const userId = req.user?._id;

    const { amount, withdrawAddress, network } = req.body;

    if (!amount || !withdrawAddress || !network) {
      return next(new ApiError(400, "All fields are required"));
    }

    if (!userId) {
      return next(new ApiError(401, "User not authenticated"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return next(new ApiError(404, "Admin user not found"));
    }

    const fee = Number(amount) * WITHDRAW_CHARGE;
    const withdrawFee = Number(fee.toFixed(2));
    const netAmount = Number(amount) - withdrawFee;

    /* ────────── get agent status by user agentId ────────── */
    let agentStatus = await AgentStatus.findOne({
      agentId: user.agentId,
    }).select("toDayDeposits totalDeposits");
    if (!agentStatus) {
      return next(new ApiError(404, "Agent status not found"));
    }

    //get user withdraw summary
    const userWithdrawSummary = await UserWithdrawSummary.findOne({
      userId: userId,
    });
    if (!userWithdrawSummary) {
      return next(new ApiError(404, "User withdraw summary not found"));
    }

    const userBalance = user.m_balance - 3;

    // check if user has sufficient balance
    if (userBalance < 0) {
      return next(new ApiError(400, "Insufficient balance for withdrawal"));
    }

    const numAmount = Number(amount);
    // Check if user has enough balance
    if (userBalance < numAmount) {
      return next(new ApiError(400, "Insufficient balance for withdrawal"));
    }

    // find company
    const company = await SystemStats.findOne();
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Deduct balance from user
    user.m_balance = Math.max(0, user.m_balance - numAmount);

    // Create withdraw request
    const withdrawCount = await Withdraw.countDocuments();

    const withdraw = await Withdraw.create({
      userId: userId,
      sl_no: `WD-${withdrawCount + 1}`,
      name: user.name,
      phone: user.phone,
      email: user.email,
      customerId: user.customerId,
      amount: numAmount,
      netAmount: netAmount,
      netWork: network,
      netWorkAddress: withdrawAddress,
      charge: withdrawFee,
      agentNumber: user.agentId,
      status: "pending",
    });

    await user.save();
    // Create cashOut transaction
    const txManager = new TransactionManager();
    await txManager.createTransaction({
      userId: user._id as string,
      customerId: user.customerId,
      amount: numAmount,
      transactionType: "cashOut",
      purpose: "Withdraw Request",
      description: `Withdraw request created with amount ${numAmount}`,
    });

    const userNotification = await Notification.create({
      user_id: user._id,
      role: user.role,
      title: "Withdraw Request Created",
      category: "withdraw",
      message: `Your withdraw request of ${numAmount} has been created successfully.`,
      url: `/withdraw-history`,
    });

    const adminNotification = await AdminNotification.create({
      user_id: admin._id,
      role: admin.role,
      title: "New Withdraw Request",
      category: "withdraw",
      message: `New withdraw request of ${numAmount} from ${user.name}`,
      url: `/withdraws/all-withdraws`,
    });

    if (global?.io?.to) {
      global.io.to(String(user._id)).emit("user-notification", {
        success: true,
        message: "Withdraw request created successfully",
        notification: userNotification,
      });
      global.io.emit("admin-notification", {
        success: true,
        message: "New withdraw request created",
        notification: adminNotification,
      });
    }

    // update company withdraw reserve
    company.withdrawals.pendingAmount += numAmount;
    company.withdrawals.pendingNetAmount += amount;
    company.withdrawals.pendingCount += 1;
    await company.save();

    res.status(200).json({
      success: true,
      message: "Withdraw request created successfully",
    });
  }
);

/* ────────── get my withdraws ────────── */
export const geMyWithdraws: typeHandler = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new ApiError(401, "User not authenticated"));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  const withdraws = await Withdraw.find({ userId: userId })
    .sort({ createdAt: -1 })
    .populate("userId", "name email phone");

  res.status(200).json({
    success: true,
    withdraws,
  });
});

// get all withdraws for admin
export const getAllWithdrawsForAdmin: typeHandler = catchAsync(
  async (req, res, next) => {
    // find all withdraws
    const withdraws = await Withdraw.find({}).sort({ createdAt: -1 });

    if (!withdraws || withdraws.length === 0) {
      return next(new ApiError(404, "No withdraws found"));
    }

    res.status(200).json({
      success: true,
      withdraws,
    });
  }
);

//get all pending withdraws for admin
export const getAllPendingWithdrawsForAdmin: typeHandler = catchAsync(
  async (req, res, next) => {
    // find all pending withdraws
    const withdraws = await Withdraw.find({ status: "pending" });

    if (!withdraws || withdraws.length === 0) {
      return next(new ApiError(404, "No pending withdraws found"));
    }

    res.status(200).json({
      success: true,
      withdraws,
    });
  }
);

//get withdraw by id
export const getWithdrawById: typeHandler = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError(400, "Withdraw ID is required"));
    }

    const withdraw = await Withdraw.findById(id);

    if (!withdraw) {
      return next(new ApiError(404, "Withdraw not found"));
    }

    res.status(200).json({
      success: true,
      withdraw,
    });
  }
);

/* ────────── approve withdraw request ────────── */
export const approveWithdrawRequest: typeHandler = catchAsync(
  async (req, res, next) => {
    const userId = req.user?._id;
    const { id, txnId, agentNumber } = req.body;

    if (!id) {
      return next(new ApiError(400, "Withdraw ID is required"));
    }

    //get admin user
    const admin = await User.findById(userId);
    if (!admin || admin.role !== "admin") {
      return next(
        new ApiError(403, "Only admin can approve withdraw requests")
      );
    }

    const withdraw = await Withdraw.findById(id);
    if (!withdraw) {
      return next(new ApiError(404, "Withdraw not found"));
    }

    // check if withdraw request is already approved
    if (withdraw.status === "approved") {
      return next(new ApiError(400, "Withdraw request already approved"));
    }

    // find user
    const user = await User.findById(withdraw.userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    //get user withdraw summary
    const withdrawSummary = await UserWithdrawSummary.findOne({
      userId: withdraw.userId,
    });
    if (!withdrawSummary) {
      return next(new ApiError(404, "User withdraw summary not found"));
    }

    // get user wallet
    const userWallet = await UserWallet.findOne({
      userId: withdraw.userId,
    });
    if (!userWallet) {
      return next(new ApiError(404, "User wallet not found"));
    }

    // find company
    const company = await SystemStats.findOne();
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    /* ────────── Get Agent Status By User AgentId ────────── */
    const agentStatus = await AgentStatus.findOne({
      agentId: user.agentId,
    });
    if (!agentStatus) {
      return next(new ApiError(404, "Agent status not found"));
    }

    // update withdraw status to approved
    withdraw.status = "approved";
    withdraw.isApproved = true;
    withdraw.approvedAt = new Date();
    withdraw.txnId = txnId;
    withdraw.agentNumber = agentNumber;
    withdraw.approvedAt = new Date();
    await withdraw.save();

    // update user balance
    user.w_balance = Math.max(0, user.w_balance + withdraw.amount);
    user.d_balance = Math.max(0, user.d_balance - withdraw.amount);
    // check if user.m_balance is less than 30
    // if (user.m_balance < 30) {
    //   user.is_active = false;
    //   await updateTeamInactiveUsers(user._id as string, withdraw.amount);
    // }
    await user.save();

    // update user withdraw summary
    withdrawSummary.totalWithdraw += withdraw.amount;
    withdrawSummary.lastWithdrawAmount += withdraw.amount;
    withdrawSummary.lastWithdrawDate = new Date();
    await withdrawSummary.save();

    // update user wallet
    userWallet.totalWithdraw += withdraw.amount;
    await userWallet.save();

    // update company withdraw reserve
    company.withdrawals.total += withdraw.amount;
    company.withdrawals.today += withdraw.amount;
    company.withdrawals.pendingAmount -= withdraw.amount;
    company.withdrawals.pendingNetAmount -= withdraw.netAmount;
    company.withdrawals.pendingCount -= 1;
    company.withdrawals.totalCharge += withdraw.charge;
    company.withdrawals.netTotal += withdraw.netAmount;
    await company.save();

    /* ──────────Call update user team withdraw ────────── */
    await updateTeamWithdraw(withdraw.userId, withdraw.amount);

    // update agent status
    agentStatus.totalWithdrawals += withdraw.amount;
    agentStatus.toDayWithdrawals += withdraw.amount;
    await agentStatus.save();

    // send notification to user
    const userNotification = await Notification.create({
      user_id: user._id,
      role: user.role,
      title: "Withdraw Request Approved",
      category: "withdraw",
      message: `Your withdraw request of ${withdraw.amount} has been approved.`,
      url: `/withdraw-history`,
    });

    if (global?.io?.to) {
      global.io.to(String(user._id)).emit("user-notification", {
        success: true,
        message: "Withdraw request approved successfully",
        notification: userNotification,
      });
    }

    /* ────────── send email to user ────────── */
    const html = withdrawApprovalTemplate({
      name: user.name,
      amount: withdraw.amount,
      txId: withdraw._id as string,
      walletAddress: withdraw.netWorkAddress,
    });

    await sendEmail({
      email: user.email,
      subject: "Withdraw Request Approved",
      html: html,
    });

    console.log(
      `Withdraw request approved for user: ${user.name}, Amount: ${withdraw.amount}`
    );

    res.status(200).json({
      success: true,
      message: "Withdraw request approved successfully",
      withdraw,
    });
  }
);

// reject withdraw request
export const rejectWithdrawRequest: typeHandler = catchAsync(
  async (req, res, next) => {
    const userId = req.user?._id;
    const { id, reason } = req.body;

    if (!id) {
      return next(new ApiError(400, "Withdraw ID is required"));
    }

    if (!reason) {
      return next(new ApiError(400, "Reason for rejection is required"));
    }

    //get admin user
    const admin = await User.findById(userId);
    if (!admin || admin.role !== "admin") {
      return next(new ApiError(403, "Only admin can reject withdraw requests"));
    }

    const withdraw = await Withdraw.findById(id);
    if (!withdraw) {
      return next(new ApiError(404, "Withdraw not found"));
    }

    // check if withdraw request is already rejected
    if (withdraw.status === "rejected") {
      return next(new ApiError(400, "Withdraw request already rejected"));
    }

    // find user
    const user = await User.findById(withdraw.userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    withdraw.status = "rejected";
    withdraw.isApproved = false;
    withdraw.isRejected = true;
    withdraw.rejected_reason = reason;
    await withdraw.save();

    // update user balance
    user.m_balance += withdraw.amount;
    await user.save();

    // Create cashIn transaction
    const txManager = new TransactionManager();
    await txManager.createTransaction({
      userId: user._id as string,
      customerId: user.customerId,
      amount: withdraw.amount,
      transactionType: "cashIn",
      purpose: "Withdrawal Refund",
      description: `Withdraw request rejected with amount ${withdraw.amount}`,
    });

    // update company withdraw reserve
    const company = await SystemStats.findOne();
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    company.withdrawals.pendingAmount -= withdraw.amount;
    company.withdrawals.pendingNetAmount -= withdraw.netAmount;
    company.withdrawals.pendingCount -= 1;
    await company.save();

    const userNotification = await Notification.create({
      user_id: user._id,
      role: user.role,
      title: "Withdraw Request Rejected",
      category: "withdraw",
      message: `Your withdraw request of ${withdraw.amount} has been rejected. Reason: ${reason}`,
      url: `/withdraw-history`,
    });

    if (global?.io?.to) {
      global.io.to(String(user._id)).emit("user-notification", {
        success: true,
        message: "Withdraw request rejected",
        notification: userNotification,
      });
    }

    console.log(
      `Withdraw request rejected for user: ${user.name}, Amount: ${withdraw.amount}, Reason: ${reason}`
    );

    res.status(200).json({
      success: true,
      message: "Withdraw request rejected successfully",
      withdraw,
    });
  }
);
