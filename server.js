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

// Holds all entities
const entities = [];
let nextId = 0;

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    const tps = 1000 / 20;
    function tick() {
        //console.log(positions);

        // Requests all clients to send position to the server
        io.emit("getpos", );

        // Emits all positions of all clients
        io.emit("allpos", entities);
    }
    setInterval(tick, tps);
});

// Handle a socket connection request from web client
io.on("connection", (socket) => {
    // Creating the entity
    const id = nextId;
    const thisEntity = {id: id, position : null};
    entities.push(thisEntity);
    nextId++;

    console.log(`Client connected with ID ${id}`);

    // In the init function we could eventually pass in a position to start the player at.
    socket.emit("init", id);

    // On client disconnect
    socket.on("disconnect", () => {
        console.log(`Client ${id} disconnected!`);

        const index = entities.indexOf(thisEntity);
        entities.splice(index,1);
    });

    // On client emit position to server
    socket.on("pos", (clientEntity) => {
        thisEntity.position = clientEntity;
    });

});