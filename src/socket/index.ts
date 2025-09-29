import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export let io: SocketIOServer;

export const attach = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    socket.on("join-room", (userId: string) => {
      socket.join(userId);
      console.log(`📦 ${socket.id} joined room: ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
