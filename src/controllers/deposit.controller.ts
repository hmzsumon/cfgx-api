import { AdminNotification } from "@/models/AdminNotification.model";
import { Deposit } from "@/models/Deposit.model";
import { Notification } from "@/models/Notification.model";
import SystemStats from "@/models/SystemStats.model";
import { User } from "@/models/user.model";
import UserWallet from "@/models/UserWallet.model";
import { createPayment } from "@/services/blockbee.service";
import { sendEmail } from "@/services/email/emailService";
import { depositTemplate } from "@/services/email/templates/depositTemplate";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { applySponsorBonus } from "@/utils/applySponsorBonus";
import { catchAsync } from "@/utils/catchAsync";
import TransactionManager from "@/utils/TransactionManager";
import updateTeamActiveUsers from "@/utils/updateTeamActiveUsers";
import updateTeamSales from "@/utils/updateTeamSales";
import { v4 as uuidv4 } from "uuid";

// Extend NodeJS global type to include 'io'
declare global {
  // eslint-disable-next-line no-var
  var io:
    | {
        to: (room: string) => {
          emit: (event: string, data: any) => void;
        };
        emit: (event: string, data: any) => void;
      }
    | undefined;
}

// Create Deposit wWith BlockBee
export const createDepositWithBlockBee: typeHandler = catchAsync(
  async (req, res, next) => {
    const userId = req.user?._id;

    if (!userId) {
      return next(new ApiError(401, "User not authenticated"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    const { chain, network, sourceAddress } = req.body;

    // check if user has any pending deposits
    const pendingDeposit = await Deposit.findOne({
      userId: userId,
      status: "pending",
    });

    let deposit = {};

    if (pendingDeposit) {
      deposit = pendingDeposit;
    } else {
      const rawUuid = uuidv4();
      const orderId = rawUuid.replace(/-/g, "");

      const callbackUrl = `https://cpfx-api-01d22e6d8bdf.herokuapp.com/api/v1/callback/${orderId}`;
      // console.log(`Callback URL: ${callbackUrl}`);

      const payment = await createPayment({
        myAddress: sourceAddress,
        callback: callbackUrl,
      });

      if (!payment) return next(new ApiError(500, "Failed to create payment"));

      deposit = await Deposit.create({
        userId: userId,
        orderId: orderId,
        name: user.name,
        phone: user.phone,
        email: user.email,
        customerId: user.customerId,
        chain,
        network,
        status: "pending",
        destinationAddress: payment.address_in,
        qrCode: payment.qrCode,
        callbackUrl,
      });
    }

    // console.log("Deposit created:", deposit);

    res.status(201).json({
      success: true,
      message: "Deposit created successfully",
      deposit,
    });
  }
);

// handle callback from BlockBee
export const handleBlockBeeCallback: typeHandler = catchAsync(
  async (req, res, next) => {
    const depositId = req.params.id;
    const { confirmations, txid_in, value_coin, result, value_forwarded_coin } =
      req.query;

    if (
      !confirmations ||
      !txid_in ||
      !value_coin ||
      !result ||
      !value_forwarded_coin
    ) {
      return next(new ApiError(400, "Missing required query parameters"));
    }

    const deposit = await Deposit.findOne({ orderId: depositId });
    if (!deposit) {
      return next(new ApiError(404, "Deposit not found"));
    }

    if (deposit.isApproved) return res.status(200).send("✅ Already approved");

    if (result === "sent" && Number(confirmations) >= 1) {
      const amount = Number(value_coin);
      const forwarded = Number(value_forwarded_coin);
      const charge = amount - forwarded;

      deposit.status = "approved";
      deposit.amount = amount;
      deposit.isApproved = true;
      deposit.approvedAt = new Date();
      deposit.txId = Array.isArray(txid_in)
        ? (txid_in[0] as string)
        : String(txid_in);
      deposit.confirmations = Number(confirmations);
      deposit.callbackReceivedAt = new Date();
      deposit.charge = charge;
      deposit.receivedAmount = amount - charge; // BlockBee received amount
      await deposit.save();

      const user = await User.findById(deposit.userId);
      if (!user) return next(new ApiError(404, "User not found"));

      const wallet = await UserWallet.findOne({ userId: user._id });
      if (!wallet) return next(new ApiError(404, "Wallet not found"));

      const company = await SystemStats.findOne();
      if (!company) return next(new ApiError(404, "Company stats not found"));
      const activeAmount = user.m_balance + amount;

      user.m_balance += amount;
      user.d_balance = (user.d_balance ?? 0) + amount;

      if (activeAmount >= 30 && !user.is_active) {
        user.is_active = true;
        user.activeAt = new Date();
        await updateTeamActiveUsers(user._id as string);
        company.users.activeToday += 1;
        company.users.activeTotal += 1;
      }
      await user.save();

      wallet.totalDeposit += amount;
      await wallet.save();
      updateTeamSales(user._id as string, amount);

      company.deposits.total += amount;
      company.deposits.today += amount;

      company.deposits.blockbeeReceivedTotal += forwarded;
      company.deposits.blockbeeReceivedToday += forwarded;
      company.deposits.blockbeeFee += charge;
      company.costs.total += charge;
      company.costs.charge += charge;
      await company.save();

      if (amount >= 100) {
        await applySponsorBonus({
          userName: user.name,
          sponsorId: user.sponsorId as any,
          amount,
        });
      }

      const admin = await User.findOne({ role: "admin" });
      const notifyText = `You have successfully deposited ${amount} USDT.`;

      const userNotification = await Notification.create({
        user_id: user._id,
        role: user.role,
        title: "USDT Deposit Successful",
        category: "deposit",
        message: notifyText,
        url: `/deposit-history`,
      });

      const adminNotification =
        admin &&
        (await AdminNotification.create({
          user_id: admin._id,
          role: admin.role,
          title: "New Deposit",
          category: "deposit",
          message: `New deposit of ${amount} from ${user.name}`,
          url: `/deposits/all-deposits`,
        }));

      const txManager = new TransactionManager();
      await txManager.createTransaction({
        userId: user._id as string,
        customerId: user.customerId,
        transactionType: "cashIn",
        amount,
        purpose: "Deposit",
        description: notifyText,
      });

      if (global?.io?.to) {
        console.log(`Emitting deposit update to user ${user._id}`);
        global.io.to(String(user._id)).emit("deposit-update", {
          success: true,
          message: "Deposit confirmed ✅",
          amount,
          txId: txid_in,
          depositId: deposit._id,
        });

        global.io.to(String(user._id)).emit("user-notification", {
          success: true,
          message: "Deposit confirmed ✅",
          notification: userNotification,
        });

        if (adminNotification && admin?._id) {
          global.io.emit("admin-notification", {
            success: true,
            message: "New Deposit",
            notification: adminNotification,
          });
        }
      }

      // Send email to user
      const html = depositTemplate(user.name, amount, depositId);
      await sendEmail({
        email: user.email,
        subject: "Deposit Confirmation",
        html: html,
      });

      return res.status(200).send("✅ Deposit confirmed and balance updated");
    }

    res.status(200).json({
      success: true,
      message: "Callback processed successfully",
    });
  }
);

// get my deposits
export const getMyDeposits: typeHandler = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new ApiError(401, "User not authenticated"));
  }

  const deposits = await Deposit.find({ userId: userId }).sort({
    createdAt: -1,
  });
  // Count total deposits for the partner
  const totalDeposits = await Deposit.countDocuments({
    user_id: userId,
  });

  res.status(200).json({
    success: true,
    deposits,
    totalDeposits,
    message: "Deposits retrieved successfully",
  });
});

// test socket connection
export const testSocketConnection: typeHandler = catchAsync(
  async (req, res, next) => {
    if (!global.io) {
      return next(new ApiError(500, "Socket.io not initialized"));
    }

    const userId = req.user?._id;
    if (!userId) {
      return next(new ApiError(401, "User not authenticated"));
    }

    // get user by ID
    const user = await User.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    const notifyText = `You have successfully deposited 100 USDT.`;

    const userNotification = await Notification.create({
      user_id: user._id,
      role: user.role,
      title: "USDT Deposit Successful",
      category: "deposit",
      message: notifyText,
      url: `/deposit-history`,
    });

    global.io.to(String(user._id)).emit("user-notification", {
      success: true,
      message: "Deposit confirmed ✅",
      notification: userNotification,
    });

    console.log(`Socket connection test successful for user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Socket connection test successful",
    });
  }
);

// get all deposits for admin
export const getAllDepositsForAdmin: typeHandler = catchAsync(
  async (req, res, next) => {
    const deposits = await Deposit.find({
      isApproved: true,
    })
      .sort({ createdAt: -1 })
      .select("-qrCode ");

    if (!deposits || deposits.length === 0) {
      return next(new ApiError(404, "No deposits found"));
    }

    res.status(200).json({
      success: true,
      deposits,
      message: "All deposits retrieved successfully",
    });
  }
);

// get deposit by ID for admin
export const getDepositByIdForAdmin: typeHandler = catchAsync(
  async (req, res, next) => {
    const depositId = req.params.depositId;

    if (!depositId) {
      return next(new ApiError(400, "Deposit ID is required"));
    }

    const deposit = await Deposit.findById(depositId).select("-qrCode ");

    if (!deposit) {
      return next(new ApiError(404, "Deposit not found"));
    }

    res.status(200).json({
      success: true,
      deposit,
      message: "Deposit retrieved successfully",
    });
  }
);
