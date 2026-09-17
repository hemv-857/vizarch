// vizarch collab-service — WebSocket mini-service for real-time collaboration.
// Port: 3003
// Handles: room-based presence, cursor sharing, diagram change broadcasts.

import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

// roomSlug → Map(socketId, Collaborator)
const rooms = new Map<string, Map<string, Collaborator>>();

function getRoom(slug: string): Map<string, Collaborator> {
  if (!rooms.has(slug)) {
    rooms.set(slug, new Map());
  }
  return rooms.get(slug)!;
}

function getCollaborators(slug: string): Collaborator[] {
  return Array.from(getRoom(slug).values());
}

const COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7",
  "#ec4899", "#14b8a6", "#0ea5e9", "#eab308",
];

io.on("connection", (socket) => {
  console.log(`[collab] connected: ${socket.id}`);

  socket.on("join-room", (data: { slug: string; name: string }) => {
    const { slug, name } = data;
    if (!slug || !name) return;

    socket.join(slug);
    const room = getRoom(slug);
    const color = COLORS[room.size % COLORS.length];
    const collaborator: Collaborator = {
      id: socket.id,
      name,
      color,
      cursor: null,
      selectedNodeId: null,
    };
    room.set(socket.id, collaborator);

    // Send current collaborators to the new user
    socket.emit("room-state", {
      collaborators: getCollaborators(slug).filter((c) => c.id !== socket.id),
    });

    // Broadcast new user to others
    socket.to(slug).emit("user-joined", collaborator);

    console.log(`[collab] ${name} joined room ${slug} (${room.size} total)`);
  });

  socket.on("cursor-move", (data: { slug: string; x: number; y: number }) => {
    const { slug, x, y } = data;
    const room = rooms.get(slug);
    if (!room) return;
    const collab = room.get(socket.id);
    if (!collab) return;
    collab.cursor = { x, y };
    socket.to(slug).emit("cursor-move", { id: socket.id, x, y, color: collab.color, name: collab.name });
  });

  socket.on("select-node", (data: { slug: string; nodeId: string | null }) => {
    const { slug, nodeId } = data;
    const room = rooms.get(slug);
    if (!room) return;
    const collab = room.get(socket.id);
    if (!collab) return;
    collab.selectedNodeId = nodeId;
    socket.to(slug).emit("select-node", { id: socket.id, nodeId, color: collab.color, name: collab.name });
  });

  socket.on("diagram-update", (data: { slug: string; graphJson: string; author: string }) => {
    const { slug, graphJson, author } = data;
    socket.to(slug).emit("diagram-update", { graphJson, author, timestamp: Date.now() });
  });

  socket.on("leave-room", (data: { slug: string }) => {
    const { slug } = data;
    const room = rooms.get(slug);
    if (!room) return;
    room.delete(socket.id);
    socket.to(slug).emit("user-left", { id: socket.id });
    if (room.size === 0) {
      rooms.delete(slug);
      console.log(`[collab] room ${slug} emptied and removed`);
    }
  });

  socket.on("disconnect", () => {
    // Remove from all rooms
    for (const [slug, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        socket.to(slug).emit("user-left", { id: socket.id });
        console.log(`[collab] ${socket.id} left room ${slug}`);
        if (room.size === 0) {
          rooms.delete(slug);
        }
      }
    }
    console.log(`[collab] disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error(`[collab] socket error (${socket.id}):`, error);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[vizarch] collab-service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[collab] SIGTERM received, shutting down…");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[collab] SIGINT received, shutting down…");
  httpServer.close(() => process.exit(0));
});
