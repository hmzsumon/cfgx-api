import { Notification } from "@/models/Notification.model";
import SystemStats from "@/models/SystemStats.model";
import { User } from "@/models/user.model";
import Wallet from "@/models/UserWallet.model";
import { typeHandler } from "@/types/express";
import { ApiError } from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import TransactionManager from "@/utils/TransactionManager";
import { num } from "../utils/money";

/* ────────── Send Money ────────── */
export const sendMoney: typeHandler = catchAsync(async (req, res, next) => {
  const sender = req.user;
  if (!sender || !sender._id) {
    return next(new ApiError(401, "User not authenticated"));
  }

  const { amount, recipient_id } = req.body;
  if (!amount || amount <= 0 || !recipient_id) {
    return next(new ApiError(400, "Amount is required"));
  }

  const company = await SystemStats.findOne();
  if (!company) return next(new ApiError(404, "Company stats not found"));

  const numAmount = num(amount);
  if (isNaN(numAmount)) {
    return next(new ApiError(400, "Invalid amount"));
  }
  const fee = numAmount * 0.02;
  const grossAmount = numAmount + fee;

  /* ────────── Check user balance ────────── */

  if (sender.m_balance < grossAmount) {
    return next(new ApiError(400, "Insufficient balance"));
  }

  const recipient = await User.findOne({ customerId: recipient_id });
  if (!recipient) {
    return next(new ApiError(404, "Recipient not found"));
  }

  const senderWallet = await Wallet.findOne({ userId: sender._id });
  if (!senderWallet) {
    return next(new ApiError(404, "Sender wallet not found"));
  }

  const recipientWallet = await Wallet.findOne({ userId: recipient._id });
  if (!recipientWallet) {
    return next(new ApiError(404, "Recipient wallet not found"));
  }

  /* ────────── update sender balance ────────── */
  sender.m_balance -= grossAmount;
  await sender.save();

  /* ────────── update sender wallet ────────── */
  senderWallet.totalSend += numAmount;
  await senderWallet.save();

  /* ────────── update recipient balance ────────── */
  recipient.m_balance += numAmount;
  await recipient.save();
  const txManager = new TransactionManager();
  await txManager.createTransaction({
    userId: sender._id as string,
    customerId: sender.customerId,
    transactionType: "cashOut",
    amount: grossAmount,
    purpose: "Send Money",
    description: `Sent money to ${recipient.customerId}`,
  });

  /* ────────── update recipient balance ────────── */
  recipient.m_balance += numAmount;
  await recipient.save();

  await txManager.createTransaction({
    userId: recipient._id as string,
    customerId: recipient.customerId,
    transactionType: "cashIn",
    amount,
    purpose: "Receive Money",
    description: `Received money from ${sender.customerId}`,
  });

  /* ────────── update recipient wallet ────────── */
  recipientWallet.totalReceive += numAmount;
  await recipientWallet.save();
  const userNotification = await Notification.create({
    user_id: recipient._id,
    role: recipient.role,
    title: "USDT Deposit Successful",
    category: "deposit",
    message: `You have successfully received ${amount} USDT from ${sender.customerId}.`,
    url: `/transactions`,
  });

  if (global?.io?.to) {
    console.log(`Emitting deposit update to user ${recipient._id}`);

    global.io.to(String(recipient._id)).emit("user-notification", {
      success: true,
      message: "Deposit confirmed ✅",
      notification: userNotification,
    });
  }

  company.totalUserToUserTransfer += numAmount;
  company.todayUserToUserTransfer += numAmount;
  company.income.sendCharge += fee;
  await company.save();

  res.status(200).json({
    success: true,
    message: "Money sent successfully",
  });
});
