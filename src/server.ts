// src/server.ts
import dotenv from "dotenv";
import http from "http";
import app from "./app";

import { connectDB } from "@/config/db";
import { startTpWsEngine, stopTpWsEngine } from "@/services/tpClose.ws.service";
import { attach } from "@/socket";

// Load env (Heroku-তে Config Vars থেকেই আসবে; .env লোকালের জন্য)
dotenv.config();

const PORT = Number(process.env.PORT || 3000);

async function bootstrap() {
  try {
    // 1) DB connect (ফেল করলে সার্ভার না তুলুন—লগ দেখুন)
    await connectDB();

    // 2) Proxy-aware (Heroku reverse proxy)
    app.set("trust proxy", 1 as any);

    // 3) HTTP server + Socket.IO
    const server = http.createServer(app);
    const io = attach(server);
    (global as any).io = io;

    // 4) Start server (0.0.0.0 + $PORT)
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server listening on ${PORT}`);
      // WS-driven TP engine এখন চালু করুন
      startTpWsEngine();
    });

    // 5) Graceful shutdown
    const shutdown = () => {
      console.log("🛑 Shutting down…");
      try {
        stopTpWsEngine();
      } catch {}
      server.close(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // 6) Error handlers — log only (hard exit নয়)
    process.on("unhandledRejection", (err: any) => {
      console.error("❌ Unhandled Rejection:", err?.stack || err);
    });
    process.on("uncaughtException", (err: any) => {
      console.error("❌ Uncaught Exception:", err?.stack || err);
    });
  } catch (err: any) {
    // DB/config problem? — Heroku logs এ দেখুন
    console.error("❌ Boot failed:", err?.stack || err);
    // hard exit নয়—ক্র্যাশ-লুপ এড়াতে লগ করে থামুন
  }
}

bootstrap();
