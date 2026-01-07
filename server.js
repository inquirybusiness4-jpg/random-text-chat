const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 5e6
});

app.use(express.static(path.join(__dirname, "public")));

let waiting = {
  any: [],
  boys: [],
  girls: []
};

let onlineCount = 0;

/* REMOVE USER FROM ALL QUEUES */
function removeFromQueues(id) {
  Object.keys(waiting).forEach(g => {
    waiting[g] = waiting[g].filter(sid => sid !== id);
  });
}

/* MATCH USERS */
function match(socket) {
  const gender = socket.gender || "any";
  const queues = gender === "any"
    ? ["any", "boys", "girls"]
    : ["any", gender];

  for (const q of queues) {
    if (waiting[q].length > 0) {
      const partnerId = waiting[q].shift();
      const partner = io.sockets.sockets.get(partnerId);

      if (partner && !partner.partner) {
        socket.partner = partner.id;
        partner.partner = socket.id;

        socket.emit("connected");
        partner.emit("connected");
        return;
      }
    }
  }

  socket.emit("waiting");
  waiting[gender].push(socket.id);
}

/* SOCKET */
io.on("connection", socket => {
  onlineCount++;
  io.emit("online-count", onlineCount);

  socket.partner = null;
  socket.gender = "any";

  socket.on("start-chat", gender => {
    socket.gender = gender || "any";

    if (socket.partner) {
      io.to(socket.partner).emit("partner-left");
      const p = io.sockets.sockets.get(socket.partner);
      if (p) p.partner = null;
      socket.partner = null;
    }

    removeFromQueues(socket.id);
    match(socket);
  });

  socket.on("message", msg => {
    if (socket.partner) {
      io.to(socket.partner).emit("message", msg);
    }
  });

  socket.on("disconnect", () => {
    onlineCount--;
    io.emit("online-count", onlineCount);

    removeFromQueues(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-left");
      const p = io.sockets.sockets.get(socket.partner);
      if (p) {
        p.partner = null;
        match(p);
      }
    }
  });
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
