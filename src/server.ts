import dotenv from "dotenv";
import http from "http";
// import "module-alias/register";

import { connectDB } from "@/config/db";
import { setupDailyStatsResetCron } from "@/crons/dataResetCron";
import { attach } from "@/socket"; // <-- updated import
import app from "./app";

// Handling Uncaught Exception
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

// Load env
dotenv.config({ path: "./.env" });

// DB connect
connectDB();

// Start cron job after DB connection is initiated
setupDailyStatsResetCron(); // ✅ Add this line here

// Start Server
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ✅ Attach Socket.IO and assign to global
const io = attach(server);
// globalThis.io = io;
(global as any).io = io;

// Handle Unhandled Promise Rejection
process.on("unhandledRejection", (err: any) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});
