const socket = io();

function startChat() {
  socket.emit("join", {
    gender: document.getElementById("gender").value,
    want: document.getElementById("want").value
  });
}

function sendMessage() {
  const msg = document.getElementById("message").value;
  if (!msg.trim()) return;

  socket.emit("message", msg);
  document.getElementById("chatBox").innerHTML += `<p><b>You:</b> ${msg}</p>`;
  document.getElementById("message").value = "";
}

socket.on("message", (msg) => {
  document.getElementById("chatBox").innerHTML += `<p><b>Stranger:</b> ${msg}</p>`;
});

socket.on("matched", () => {
  document.getElementById("chatBox").innerHTML += `<p><i>Connected to stranger</i></p>`;
});
