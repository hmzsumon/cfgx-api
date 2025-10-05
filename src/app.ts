// ✅ Updated app.ts with secure CORS config for Cookie-based Auth

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fileUpload from "express-fileupload";

import adminRoutes from "@/routes/admin.routes";
import agentRoutes from "@/routes/agent.routes";
import depositRoutes from "@/routes/deposit.routes";
import notificationRoutes from "@/routes/notification.routes";
import rankRoutes from "@/routes/rank.routes";
import userRoutes from "@/routes/user.routes";
import wheelRoutes from "@/routes/wheel.routes";
import withdrawRoutes from "@/routes/withdraw.routes";
import { errorHandler } from "./middlewares/errorHandler";
import accountRoutes from "./routes/account.routes";
import aiAccountRoutes from "./routes/aiAccount.routes";
import cryptoRoutes from "./routes/crypto.routes";
import tradeRoutes from "./routes/trade.routes";
import transactionRoutes from "./routes/transactions.routes";
import transferRoutes from "./routes/transfer.routes";

// Config
if (process.env.NODE_ENV !== "PRODUCTION") {
  dotenv.config({ path: "src/config/config.env" });
}

const app = express();

// 🔐 CORS config for frontend cookie-auth support
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://www.capitalisegfx.com",
  "https://cfgx-admin.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // ✅ Required to accept cookies from frontend
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

// Routes
app.use("/api/v1", userRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", depositRoutes);
app.use("/api/v1", rankRoutes);
app.use("/api/v1", notificationRoutes);
app.use("/api/v1", withdrawRoutes);
app.use("/api/v1", wheelRoutes);
app.use("/api/v1", agentRoutes);
app.use("/api/v1", accountRoutes);
app.use("/api/v1", cryptoRoutes);
app.use("/api/v1", tradeRoutes);
app.use("/api/v1", transferRoutes);
app.use("/api/v1", aiAccountRoutes);
app.use("/api/v1", transactionRoutes);

app.use("/api", cryptoRoutes);

// Test Route
app.get("/", (req, res) => {
  const data = {
    server_time: new Date().toString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    server_mode: process.env.NODE_ENV,
    server_port: process.env.PORT,
    root_url: req.protocol + "://" + req.get("host"),
  };
  res.status(200).json({ success: true, data });
});

app.use(errorHandler);

export default app;
