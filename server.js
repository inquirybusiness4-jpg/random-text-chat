const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUsers = [];
let online = 0;

io.on("connection", socket => {
  online++;
  io.emit("online-count", online);

  socket.on("disconnect", () => {
    online--;
    io.emit("online-count", online);
    waitingUsers = waitingUsers.filter(s => s.id !== socket.id);
    if (socket.partner) {
      socket.partner.emit("partner-left");
      socket.partner.partner = null;
    }
  });

  socket.on("start-chat", pref => {
    socket.genderPref = pref || "any";
    pairUser(socket);
  });

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partner-left");
      socket.partner.partner = null;
    }
    socket.partner = null;
    pairUser(socket);
  });

  socket.on("message", msg => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  socket.on("image", img => {
    if (socket.partner) socket.partner.emit("image", img);
  });

  socket.on("delete-image", id => {
    if (socket.partner) socket.partner.emit("delete-image", id);
  });

  socket.on("typing", () => {
    if (socket.partner) socket.partner.emit("typing");
  });
});

function pairUser(socket) {
  const index = waitingUsers.findIndex(u =>
    u.genderPref === "any" ||
    socket.genderPref === "any" ||
    u.genderPref === socket.genderPref
  );

  if (index !== -1) {
    const partner = waitingUsers.splice(index, 1)[0];
    socket.partner = partner;
    partner.partner = socket;

    socket.emit("connected");
    partner.emit("connected");
  } else {
    waitingUsers.push(socket);
    socket.emit("waiting");
  }
}

server.listen(3000, () => console.log("Server running"));
