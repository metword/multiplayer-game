const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const { Pool } = require("pg");
const local = "postgresql://postgres:password@localhost:5432/postgres";

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

        // Requests all clients to send position to the server
        io.emit("getplayer", );

        // Emits all positions of all clients
        io.emit("allpos", entities);
    }
    setInterval(tick, tps);
});

// Handle a socket connection request from web client
io.on("connection", (socket) => {
    // Creating the entity
    const id = nextId;
    const thisEntity = {id: id, position : null, mouseAngle : null};
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
    socket.on("playerdata", (clientEntity, mouseAngle) => {
        thisEntity.position = clientEntity;
        thisEntity.mouseAngle = mouseAngle;
    });

    // On client login
    socket.on("login", (credentials) => {
        console.log("LOGIN");
    });
});



function getUsers(callback) {
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

/*getUsers(function(result) {
    console.log(result);
});

createUser('metword', '12345', function(result) {
    console.log(result);
});*/

//app.post("")