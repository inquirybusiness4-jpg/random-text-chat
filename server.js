const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 5e6 // 5MB image limit
});

app.use(express.static(path.join(__dirname, "public")));

/* WAITING QUEUES */
let waiting = {
  any: [],
  boys: [],
  girls: []
};

let onlineCount = 0;

/* HELPERS */
function removeFromAllQueues(id) {
  Object.keys(waiting).forEach(k => {
    waiting[k] = waiting[k].filter(sid => sid !== id);
  });
}

function tryMatch(socket) {
  let gender = socket.gender || "any";

  // Match priority logic
  let possibleQueues =
    gender === "any"
      ? ["any", "boys", "girls"]
      : ["any", gender];

  for (let q of possibleQueues) {
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

  // No partner found → wait
  socket.emit("waiting");
  waiting[gender].push(socket.id);
}

/* SOCKET */
io.on("connection", socket => {
  onlineCount++;
  io.emit("online-count", onlineCount);

  socket.partner = null;
  socket.gender = "any";

  /* START / NEXT CHAT */
  socket.on("start-chat", gender => {
    socket.gender = gender || "any";

    // Clear old state
    if (socket.partner) {
      io.to(socket.partner).emit("partner-left");
      const p = io.sockets.sockets.get(socket.partner);
      if (p) p.partner = null;
      socket.partner = null;
    }

    removeFromAllQueues(socket.id);
    tryMatch(socket);
  });

  /* TEXT MESSAGE */
  socket.on("message", msg => {
    if (socket.partner) {
      io.to(socket.partner).emit("message", msg);
    }
  });

  /* TYPING INDICATOR */
  socket.on("typing", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("typing");
    }
  });

  /* IMAGE SEND */
  socket.on("image", data => {
    if (socket.partner) {
      io.to(socket.partner).emit("image", data);
    }
  });

  /* IMAGE DELETE (SYNC BOTH SIDES) */
  socket.on("delete-image", id => {
    if (socket.partner) {
      io.to(socket.partner).emit("delete-image", id);
    }
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    onlineCount--;
    io.emit("online-count", onlineCount);

    removeFromAllQueues(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-left");

      const p = io.sockets.sockets.get(socket.partner);
      if (p) {
        p.partner = null;
        // AUTO RECONNECT PARTNER
        tryMatch(p);
      }
    }
  });
});

/* SERVER */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
