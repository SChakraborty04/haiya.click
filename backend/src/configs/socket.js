// lib/socket.js
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import valkey from "./valkey.client.js";
import Poll from "../models/polls.model.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";

let io;

export const initSocket = (httpServer) => {
  const allowedOrigins = ["http://localhost:5173", "http://localhost:3000", process.env.FRONTEND_URL].filter(Boolean);
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  // Use Valkey as the Pub/Sub messenger between server instances
  const pubClient = valkey;
  const subClient = valkey.duplicate(); // Subscriptions need their own connection

  pubClient.on("error", (err) => console.error("Valkey pub error:", err));
  subClient.on("error", (err) => console.error("Valkey sub error:", err));
  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific poll room
    socket.on("join-poll", async (payload) => {
      const pollId = typeof payload === "string" ? payload : payload?.pollId;
      if (!pollId) return;

      // Check if this poll requires authentication before allowing the join
      try {
        const poll = await Poll.findById(pollId).select('requireAuth isStarted isPublished expiryDate').lean();
        if (poll?.requireAuth) {
          // Expect the client to pass the Bearer token in socket.auth.token
          const token = socket.handshake.auth?.token;
          let valid = false;
          if (token) {
            try { verifyAccessToken(token); valid = true; } catch { valid = false; }
          }
          if (!valid) {
            socket.emit("JOIN_REJECTED", { reason: "auth_required", message: "This poll requires you to be logged in." });
            return; // Don't join the room
          }
        }

        socket.join(pollId);
        console.log(`Socket ${socket.id} joined room: ${pollId}`);

        // Broadcast updated user count to everyone in the room
        const sockets = await io.in(pollId).fetchSockets();
        const count = sockets.length;
        io.to(pollId).emit("USERS_COUNT", { pollId, count });

        // Update maxConcurrentUsers if this is a new peak (fire-and-forget)
        Poll.findOneAndUpdate(
          { _id: pollId, maxConcurrentUsers: { $lt: count } },
          { $set: { maxConcurrentUsers: count } }
        ).catch(() => {});

        // If the poll is already live, catch up this late-joiner / slow-connector
        // by replaying QUESTION_PUBLISHED directly to their socket
        if (poll?.isStarted && !poll?.isPublished && poll?.expiryDate) {
          socket.emit("QUESTION_PUBLISHED", {
            pollId: pollId.toString(),
            expiryDate: new Date(poll.expiryDate).toISOString(),
          });
        }
      } catch (err) {
        console.error("[join-poll] error:", err.message);
      }
    });

    socket.on("disconnecting", async () => {
      // For each room this socket was in, emit updated count after leaving
      for (const room of socket.rooms) {
        if (room === socket.id) continue; // skip personal room
        const sockets = await io.in(room).fetchSockets();
        // count - 1 because this socket hasn't left yet
        const newCount = Math.max(0, sockets.length - 1);
        socket.to(room).emit("USERS_COUNT", { pollId: room, count: newCount });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};