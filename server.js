// server.js
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); 
require("dotenv").config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI;
console.log(MONGODB_URI);
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("JWT_SECRET environment variable is not set");
  process.exit(1);
}

// define minimal mongoose schemas here so server.js can run with node
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  avatarUrl: String,
}, { timestamps: true });

const convSchema = new mongoose.Schema({
  roomId: { 
    type: String, 
    required: true,  // now required
    unique: true,    // must be unique
    default: uuidv4  // ⬅️ auto-generate on create
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessageAt: Date,
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  roomId: String,
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  read: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", convSchema);
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

// connect mongoose
mongoose.connect(MONGODB_URI, {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log("Mongoose connected successfully");
}).catch((err) => {
  console.error("Mongoose connection error:", err);
  process.exit(1);
});

// Handle mongoose connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    cors: { 
      origin: process.env.NODE_ENV === 'production' ? false : "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // map userId -> socketId
  const online = new Map();

  // middleware: verify JWT on handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || null;
      if (!token) {
        return next(new Error("Auth error: token missing"));
      }
      
      const payload = jwt.verify(token, JWT_SECRET);
      if (!payload || !payload.sub) {
        return next(new Error("Auth error: invalid token"));
      }
      
      socket.user = { id: payload.sub, name: payload.name };
      return next();
    } catch (err) {
      console.error("Socket auth error:", err);
      return next(new Error("Auth error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log("Socket connected:", socket.id, "user:", socket.user.name, userId);
    online.set(userId, socket.id);

    // broadcast online users list (simple)
    const onlineUsers = Array.from(online.keys());
    io.emit("online_users", onlineUsers);

    // join room explicitly (optional)
    socket.on("join_room", async ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') {
        console.error("Invalid roomId:", roomId);
        return;
      }
      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);
    });

    // handle private messages (toUserId expected)
    socket.on("private_message", async ({ toUserId, text }) => {
      try {
        if (!toUserId || !text || typeof text !== 'string') {
          console.error("Invalid message data:", { toUserId, text });
          return;
        }

        if (text.trim().length === 0) {
          console.error("Empty message text");
          return;
        }

        const fromUserId = new mongoose.Types.ObjectId(userId);
        const toIdObj = new mongoose.Types.ObjectId(toUserId);

        // roomId by sorting string ids
        const ids = [userId, toUserId].sort();
        const roomId = ids.join("_");

        // ensure conversation exists
        let conv = await Conversation.findOne({ roomId });
        if (!conv) {
          conv = await Conversation.create({ roomId, participants: [fromUserId, toIdObj] });
        } else {
          conv.lastMessageAt = new Date();
          await conv.save();
        }

        const msg = await Message.create({
          conversation: conv._id,
          roomId,
          from: fromUserId,
          to: toIdObj,
          text: text.trim(),
        });

        const payload = {
          id: msg._id,
          conversation: conv._id,
          roomId,
          from: userId,
          to: toUserId,
          text: msg.text,
          createdAt: msg.createdAt,
        };

        // ensure both sockets join room
        socket.join(roomId);
        const toSocketId = online.get(toUserId);
        if (toSocketId) {
          const s = io.sockets.sockets.get(toSocketId);
          if (s) s.join(roomId);
        }

        // emit to the room
        io.to(roomId).emit("private_message", payload);
        console.log(`Message sent from ${userId} to ${toUserId} in room ${roomId}`);
      } catch (err) {
        console.error("Error handling private message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", userId);
      online.delete(userId);
      io.emit("online_users", Array.from(online.keys()));
    });

    socket.on("error", (error) => {
      console.error("Socket error for user", userId, ":", error);
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`> Server ready on http://localhost:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });
});
