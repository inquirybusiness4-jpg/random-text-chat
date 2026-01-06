const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let onlineUsers = 0;
let waitingUser = null;
const pairs = new Map();

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("online-users", onlineUsers);

  socket.on("start", () => {
    if (waitingUser && waitingUser !== socket.id) {
      pairs.set(socket.id, waitingUser);
      pairs.set(waitingUser, socket.id);

      io.to(socket.id).emit("matched");
      io.to(waitingUser).emit("matched");

      waitingUser = null;
    } else {
      waitingUser = socket.id;
      socket.emit("waiting");
    }
  });

  socket.on("message", (msg) => {
    const partner = pairs.get(socket.id);
    if (partner) {
      io.to(partner).emit("message", msg);
    }
  });

  socket.on("typing", () => {
    const partner = pairs.get(socket.id);
    if (partner) io.to(partner).emit("typing");
  });

  socket.on("next", () => {
    const partner = pairs.get(socket.id);
    if (partner) {
      pairs.delete(partner);
      io.to(partner).emit("disconnected");
    }
    pairs.delete(socket.id);
    waitingUser = socket.id;
    socket.emit("waiting");
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online-users", onlineUsers);

    const partner = pairs.get(socket.id);
    if (partner) {
      pairs.delete(partner);
      io.to(partner).emit("disconnected");
    }
    pairs.delete(socket.id);

    if (waitingUser === socket.id) waitingUser = null;
  });
});

server.listen(3000, () => console.log("Server running"));
