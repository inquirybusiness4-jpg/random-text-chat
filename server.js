const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUsers = [];

io.on("connection", (socket) => {

  socket.on("join", (user) => {
    let match = waitingUsers.find(u =>
      (u.want === user.gender || u.want === "any") &&
      (user.want === u.gender || user.want === "any")
    );

    if (match) {
      socket.partner = match.id;
      io.to(match.id).emit("matched");
      socket.emit("matched");
      waitingUsers = waitingUsers.filter(u => u.id !== match.id);
    } else {
      waitingUsers.push({ id: socket.id, ...user });
    }
  });

  socket.on("message", (msg) => {
    if (socket.partner) {
      io.to(socket.partner).emit("message", msg);
    }
  });

  socket.on("disconnect", () => {
    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
  });
});

http.listen(3000, () => {
  console.log("Server running on port 3000");
});
