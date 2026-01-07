const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUsers = [];
let pairs = new Map();
let onlineUsers = 0;

io.on("connection", (socket) => {
  // ONLINE COUNT
  onlineUsers++;
  io.emit("online-count", onlineUsers);

  // START CHAT
  socket.on("start-chat", () => {
    if (waitingUsers.includes(socket.id)) return;

    if (waitingUsers.length > 0) {
      const partnerId = waitingUsers.shift();

      pairs.set(socket.id, partnerId);
      pairs.set(partnerId, socket.id);

      io.to(socket.id).emit("connected");
      io.to(partnerId).emit("connected");
    } else {
      waitingUsers.push(socket.id);
      socket.emit("waiting");
    }
  });

  // TEXT MESSAGE
  socket.on("message", (msg) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("message", msg);
    }
  });

  // IMAGE MESSAGE (with id + src)
  socket.on("image", (imgData) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("image", imgData);
    }
  });

  // IMAGE DELETE (SYNC BOTH SIDES)
  socket.on("delete-image", (imageId) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("delete-image", imageId);
    }
  });

  // NEXT STRANGER
  socket.on("next", () => {
    const partnerId = pairs.get(socket.id);

    if (partnerId) {
      pairs.delete(partnerId);
      io.to(partnerId).emit("partner-left");
    }

    pairs.delete(socket.id);
    waitingUsers = waitingUsers.filter(id => id !== socket.id);

    waitingUsers.push(socket.id);
    socket.emit("waiting");
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online-count", onlineUsers);

    waitingUsers = waitingUsers.filter(id => id !== socket.id);

    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      pairs.delete(partnerId);
      io.to(partnerId).emit("partner-left");
    }

    pairs.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
