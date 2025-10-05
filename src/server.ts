import { connectDB } from "@/config/db";
import { setupDailyStatsResetCron } from "@/crons/dataResetCron";
import { attach } from "@/socket";
import dotenv from "dotenv";
import http from "http";
import "module-alias/register";
import app from "./app";

// ⬇️ WS-ড্রিভেন TP ইঞ্জিন
import { startTpWsEngine, stopTpWsEngine } from "@/services/tpClose.ws.service";

// Handling Uncaught Exception
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

// Load env
dotenv.config({ path: "./.env" });

// DB connect
connectDB();

// Daily stats cron (ঠিকই থাকবে)
setupDailyStatsResetCron();

const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Attach Socket.IO আগে করে নিন, যাতে global.io ইঞ্জিনে available থাকে
const io = attach(server);
(global as any).io = io;

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // ⬇️ এখন WS-ড্রিভেন TP ইঞ্জিন চালু করুন
  startTpWsEngine();
});

// Handle Unhandled Promise Rejection
process.on("unhandledRejection", (err: any) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => {
    try {
      stopTpWsEngine();
    } catch {}
    process.exit(1);
  });
});

// Graceful shutdown (Ctrl+C বা SIGTERM)
const shutdown = () => {
  console.log("🛑 Shutting down...");
  try {
    stopTpWsEngine();
  } catch {}
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
