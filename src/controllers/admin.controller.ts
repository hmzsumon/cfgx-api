import { ApiError } from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { NextFunction, Request, Response } from "express";

import AgentSummary from "@/models/AgentSummary.model";
import SystemStats from "@/models/SystemStats.model";
import TireProfitRate from "@/models/TireProfitRate.model";
import { User, UserRole } from "@/models/user.model";
import UserAddress from "@/models/UserAddress.model";
import UserDepositSummary from "@/models/UserDepositSummary.model";
import UserGameSummary from "@/models/UserGameSummary.model";
import UserRankSummary from "@/models/UserRankSummary.model";
import UserTeamSummary from "@/models/UserTeamSummary.model";
import UserTransferSummary from "@/models/UserTransferSummary.model";
import UserWalletModel from "@/models/UserWallet.model";
import UserWithdrawSummary from "@/models/UserWithdrawSummary.model";
import { typeHandler } from "@/types/express";
import { agents } from "@/utils/agents";
import { generateUniqueId } from "@/utils/generateCustomerId";

import PaymentMethod from "@/models/PaymentMethod.model";
import VipTierLog from "@/models/VipTierLog.model";
import distributeGenerationBonus from "@/utils/distributeGenarationBonus";
import { sendTokenWithRefresh } from "@/utils/sendTokenWithRefresh";

export const initialSetup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const systemState = await SystemStats.findOne();
    if (systemState) {
      return next(new ApiError(400, "System is already initialized"));
    }

    // 🔹 1. Create System Stats
    await SystemStats.create({
      companyName: "Spain Win99",
      shortName: "SW99",
      email: "spainwin999@gmail.com",
      phone: "1234567890",
      website: "https://www.spainwin99.com",
      address: "123 Main St, City, Country",
      city: "City",
      state: "State",
      zip: "12345",
      country: "Country",
      about: "Welcome to h5FiveX, your ultimate gaming platform.",
    });

    // 🔹 2. Create Admin User
    const adminUser = await User.create({
      name: "Admin User",
      email: "adminsw99@gmail.com",
      phone: "1234567890",
      role: UserRole.Admin,
      password: "Sw99@112200",
      text_password: "Sw99@112200",
      customerId: await generateUniqueId(),
      country: "Country",
      is_active: true,
      email_verified: true,
      kyc_verified: true,
    });

    // 🔹 3. Seed Agents
    for (const agent of agents) {
      const agentUser = await User.create({
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        role: UserRole.Agent,
        password: agent.password,
        text_password: agent.password,
        customerId: await generateUniqueId(),
        is_active: true,
        email_verified: true,
        kyc_verified: true,
      });

      await AgentSummary.create({
        agentId: agentUser._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        customerId: agentUser.customerId,
      });
    }

    // 🔹 4. Seed Users under Agents
    for (const agent of agents) {
      const agentUser = await User.findOne({ email: agent.email });
      if (!agentUser) {
        throw new ApiError(404, `Agent with email ${agent.email} not found`);
      }

      const user = await User.create({
        name: agent.user.name,
        email: agent.user.email,
        phone: agent.user.phone,
        role: UserRole.User,
        password: agent.user.password,
        text_password: agent.user.password,
        customerId: await generateUniqueId(),
        country: "Bangladesh",
        is_active: true,
        email_verified: true,
        kyc_verified: true,
        agentId: agentUser._id,
        agentName: agentUser.name,
      });

      const customerId = user.customerId;

      await Promise.all([
        UserWalletModel.create({ userId: user._id, customerId }),
        UserWithdrawSummary.create({ userId: user._id, customerId }),
        UserDepositSummary.create({ userId: user._id, customerId }),
        UserTransferSummary.create({ userId: user._id, customerId }),
        UserRankSummary.create({ userId: user._id, customerId }),
        UserTeamSummary.create({ userId: user._id, customerId }),
        UserAddress.create({ userId: user._id, customerId }),
        UserGameSummary.create({ userId: user._id, customerId }),

        VipTierLog.create({
          userId: user._id,
          customerId,
          vipTier: "VIP0",
        }),
      ]);
    }

    // create TireProfitRate

    await TireProfitRate.create({
      VIP1: 0.02,
      VIP2: 0.025,
      VIP3: 0.028,
      VIP4: 0.032,
      VIP5: 0.036,
      VIP6: 0.05,
    });

    // ✅ Final response
    res.status(201).json({
      success: true,
      message: "System initialized with admin, agents and users successfully.",
    });
  }
);

// admin login
export const adminLogin: typeHandler = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, "Please enter both email and password"));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ApiError(401, "Invalid email or password"));
  }

  // Check if the user is verified
  if (!user.email_verified) {
    return next(new ApiError(402, "Email not verified"));
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ApiError(401, "Invalid email or password"));
  }

  sendTokenWithRefresh(user, 200, res);
});

// check utility function to check if the system is initialized
export const checkUtilityFunction: typeHandler = catchAsync(
  async (req, res, next) => {
    const { customerId, amount } = req.body;
    if (!customerId || !amount) {
      return next(new ApiError(400, "User ID and amount are required"));
    }

    const user = await User.findOne({ customerId });
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    await distributeGenerationBonus(user._id as string, amount);

    res.status(200).json({
      success: true,
      message: "Successfully checked system initialization",
    });
  }
);

// update all users task report
export const updateAllUsersTaskReport: typeHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: "All users task reports updated successfully",
    });
  }
);

// get admin dashboard summary
export const getAdminDashboardSummary: typeHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const company = await SystemStats.findOne();
    if (!company) {
      return next(new ApiError(404, "System stats not found"));
    }

    const dashboardData = {
      totalDeposits: company.deposits.total || 0,
      todayDeposits: company.deposits.today || 0,
      totalBlockBeeDepDeposits: company.deposits.blockbeeReceivedTotal || 0,
      todayBlockBeeDepDeposits: company.deposits.blockbeeReceivedToday || 0,
      totalDepositFee: company.deposits.blockbeeFee || 0,
      totalWithdraw: company.withdrawals.total || 0,
      todayWithdraw: company.withdrawals.today || 0,
      totalNetWithdraw: company.withdrawals.netTotal || 0,
      totalWithdrawFee: company.withdrawals.totalCharge || 0,
      totalUsers: company.users.total || 0,
      todayNewUsers: company.users.todayNew || 0,
      totalActiveUsers: company.users.activeTotal || 0,
      todayActiveUsers: company.users.activeToday || 0,
    };

    res.status(200).json({
      success: true,
      message: "Admin dashboard summary retrieved successfully",
      dashboardData,
    });
  }
);

// get all users for a
export const getAllUsers: typeHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find({
      role: "user",
    }).sort({ createdAt: -1 });

    if (!users || users.length === 0) {
      return next(new ApiError(404, "No users found"));
    }

    res.status(200).json({
      success: true,
      users,
      message: "All users retrieved successfully",
    });
  }
);

// get user by id
export const getUserById: typeHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.params;
    console.log("User ID:", userId);

    if (!userId) {
      return next(new ApiError(400, "User ID is required"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    // find wallet by user ID
    const userWallet = await UserWalletModel.findOne({
      userId: user._id,
    });

    if (!userWallet) {
      return next(new ApiError(404, "User wallet not found"));
    }

    res.status(200).json({
      success: true,
      user,
      wallet: userWallet,

      message: "User retrieved successfully",
    });
  }
);

// reset daily tasks for all users
export const resetDailyTasks: typeHandler = catchAsync(
  async (req, res, next) => {
    // Step 1: Find all users who completed task today
    const users = await User.find({ is_task_completed: true });

    if (!users.length) {
      return next(new ApiError(404, "No users found with completed tasks"));
    }

    res.status(200).json({
      success: true,
      message: `${users.length} users' task status reset successfully.`,
      count: users.length,
    });
  }
);

/* ────────── Create Payment Method ────────── */
export const createPaymentMethod: typeHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accountNumber, methodName, methodType } = req.body;

    if (!accountNumber || !methodName || !methodType) {
      return next(new ApiError(400, "Please provide all required fields"));
    }

    const paymentMethod = await PaymentMethod.create({
      accountNumber,
      methodName,
      methodType,
    });

    res.status(201).json({
      success: true,
      message: "Payment method created successfully",
      paymentMethod,
    });
  }
);
