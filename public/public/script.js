const socket = io();

function start() {
  const gender = document.getElementById("gender").value;
  const want = document.getElementById("want").value;
  socket.emit("join", { gender, want });
  document.getElementById("chat").innerHTML += "<p>🔍 Searching for a partner...</p>";
}

function send() {
  const msg = document.getElementById("msg").value;
  if (msg.trim() === "") return;
  socket.emit("message", msg);
  document.getElementById("chat").innerHTML += "<p><b>You:</b> " + msg + "</p>";
  document.getElementById("msg").value = "";
}

socket.on("matched", () => {
  document.getElementById("chat").innerHTML += "<p>✅ Connected with a stranger!</p>";
});

socket.on("message", (msg) => {
  document.getElementById("chat").innerHTML += "<p><b>Stranger:</b> " + msg + "</p>";
});
