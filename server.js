const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

let onlineUsers = 0;

app.use(express.static("public"));

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("online-users", onlineUsers);

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online-users", onlineUsers);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
