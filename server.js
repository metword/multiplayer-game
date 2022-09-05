const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder.
app.use(express.static(path.join(__dirname,"/client")));

// Start server
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// Handle a socket connection request from web client
io.on("connection", (socket) => {
    console.log("Client connected!");
    socket.emit ("message","Client connected!");

    socket.on("message", (text) => {
        io.emit("message",text);
    });

});