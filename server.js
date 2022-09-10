const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

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
        io.emit("getclientdata", );

        // Emits all entity states to the client
        io.emit("sendserverdata", entities);

    }
    setInterval(tick, tps);
});

// Handle a socket connection request from web client
io.on("connection", (socket) => {
    // Creating the entity
    const thisEntity = {};

    // Setting the id for the entity
    const id = nextId;
    nextId++;

    // First ping to the client (can adde extra attributes later if needed!)
    socket.emit("init", id);

    socket.on("init", client => {
        Object.assign(thisEntity, client);
        console.log(`Client connected with ID ${id}`);
        entities.push(thisEntity);
    });

    // On client disconnect
    socket.on("disconnect", () => {
        console.log(`Client ${thisEntity.id} disconnected!`);

        const index = entities.indexOf(thisEntity);
        entities.splice(index,1);
    });

    // On client emit position to server
    socket.on("getclientdata", client => {
        Object.assign(thisEntity, client);
    });
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