const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 5e6 // 5MB
});

app.use(express.static(path.join(__dirname, "public")));

let waiting = {
  any: [],
  boys: [],
  girls: []
};

let online = 0;

function removeFromQueues(id) {
  Object.keys(waiting).forEach(k => {
    waiting[k] = waiting[k].filter(x => x !== id);
  });
}

function matchUser(socket) {
  const gender = socket.gender || "any";
  const queues = gender === "any"
    ? ["any", "boys", "girls"]
    : ["any", gender];

  for (const q of queues) {
    if (waiting[q].length > 0) {
      const pid = waiting[q].shift();
      const partner = io.sockets.sockets.get(pid);

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

io.on("connection", socket => {
  online++;
  io.emit("online-count", online);

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
    matchUser(socket);
  });

  socket.on("message", msg => {
    if (socket.partner) {
      io.to(socket.partner).emit("message", msg);
    }
  });

  socket.on("typing", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("typing");
    }
  });

  socket.on("image", data => {
    if (socket.partner) {
      io.to(socket.partner).emit("image", data);
    }
  });

  socket.on("delete-image", id => {
    if (socket.partner) {
      io.to(socket.partner).emit("delete-image", id);
    }
  });

  socket.on("disconnect", () => {
    online--;
    io.emit("online-count", online);

    removeFromQueues(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-left");
      const p = io.sockets.sockets.get(socket.partner);
      if (p) {
        p.partner = null;
        matchUser(p);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
