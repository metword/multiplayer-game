const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

class Vec {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
};

class Entity {
    id; 
    position; 
    mouseAngle;
    heldItem;
    messageQueue;

    constructor(id = 0, position = new Vec(0,0), mouseAngle=0, heldItem="fists", messageQueue=[]) {
        // Defaults
        this.id = id;
        this.position = position
        this.mouseAngle = mouseAngle;
        this.heldItem = heldItem;
        this.messageQueue = messageQueue;
    }
};

//const { Pool } = require("pg");
//const local = "postgresql://postgres:password@localhost:5432/postgres";
//const Client = require("./client/client");

// Set static folder.
app.use(express.static(path.join(__dirname,"/client")));

// Holds all entities
const entities = [];
let nextId = 0;

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    const tps = 1000 / 60;
    function tick() {
        //console.log(positions);
        removeExpiredMessages();

        // Requests all clients to send position to the server
        io.emit("getplayer", );

        // Emits all entity states to the client
        io.emit("loadplayers", entities);

    }
    setInterval(tick, tps);
});

// Handle a socket connection request from web client
io.on("connection", (socket) => {
    // Creating the entity
    const id = nextId;
    const thisEntity = new Entity(id);
    entities.push(thisEntity);
    nextId++;

    console.log(`Client connected with ID ${id}`);

    // In the init function we could eventually pass in a position to start the player at.
    socket.emit("init", thisEntity.id);

    // On client disconnect
    socket.on("disconnect", () => {
        console.log(`Client ${thisEntity.id} disconnected!`);

        const index = entities.indexOf(thisEntity);
        entities.splice(index,1);
    });

    // On client emit position to server
    socket.on("clientdata", entity => {
        thisEntity.position = entity.position;
        thisEntity.heldItem = entity.heldItem;
        thisEntity.mouseAngle = entity.mouseAngle;
        thisEntity.messageQueue = entity.messageQueue;
    });

    //socket.on("chat", (chatMessage) => {
    //    console.log(`${thisEntity.id} > ${chatMessage}`);
    //    const messagePackage = {message: chatMessage, time: new Date().getTime()};
    //    thisEntity.messageQueue.push(messagePackage);
    //});

    // On client login
    //socket.on("login", (credentials) => {
    //    console.log("LOGIN");
    //});
});

//FROM const entities, will remove messages with a timestamp over some number
// on client side, we can prevent the rendering of messages sooner be
function removeExpiredMessages() {

}

//FOR WHEN I WANT TO MAKE A LOGIN SYSTEM...
/*function getUsers(callback) {
    const getDatabase = (() => {
        if (process.env.NODE_ENV !== 'production') {
            return new Pool({
                connectionString: local,
                ssl: false
            });
        } else {
            return new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            });
        } 
    })();

    const database = getDatabase;
    
    database.connect();
    
    database.query('SELECT * FROM users', (err, res) => {
        if (err) throw err;
        database.end();
        return callback(res.rows);
    });
}

function createUser(username, password, callback) {
    const getDatabase = (() => {
        if (process.env.NODE_ENV !== 'production') {
            return new Pool({
                connectionString: local,
                ssl: false
            });
        } else {
            return new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            });
        } 
    })();

    const database = getDatabase;

    database.connect();

    database.query(`INSERT into users (username, password) values ('${username}','${password}');`, (err, res) => {
        let validUser = true;
        if (err) validUser = false;    
        database.end();
        return callback(validUser);
    });
}

getUsers(function(result) {
    console.log(result);
});

createUser('metword', '12345', function(result) {
    console.log(result);
});*/

//app.post("")