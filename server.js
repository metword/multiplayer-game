const express = require("express");
const path = require("path");
const http = require("http");
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const io = socketio(server, {maxHttpBufferSize: 1e8});
const fs = require("fs");

//const { Pool } = require("pg");
//const local = "postgresql://postgres:password@localhost:5432/postgres";
//const Client = require("./client/client");

// Set static folder.
app.use(express.static(path.join(__dirname, "/client")));

// Holds all entities
const entities = [];

const map = {}

fs.readFile("map.json", (err, buff) => {
    if (err) {
        console.error(err);
        return;
    }
    Object.assign(map, JSON.parse(buff.toString()));
    //for (const tile of Object.values(map)) {
    //    if (tile.name === "watertile") {
    //        tile.id = -2;
    //    }
    //}
    //fs.writeFile("map.json", JSON.stringify(map), err => {
    //    if (err) {
    //        console.error(err);
    //        return;
    //    }
    //});
});

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    const tps = 1000 / 60;
    function tick() {
        //console.log(positions);
        removeExpiredMessages();

        // Requests all clients to send position to the server
        io.emit("getclientdata",);

        // Emits all entity states to the client
        io.emit("sendserverdata", entities);

        //console.log(entities);

    }
    setInterval(tick, tps);
});

//OPTIONS:
// set thisEntity to null if the client disconnects. 
// pros: ID === index
// cons: in client must loop through many null indexes of serverEntities;
// 
// splice thisEntity on client disconenct.
// pros: all entities passed to the client are valid
// cons: must do a search for the entity on disconnect and on client to client message;
//
// give each client an index in 


// Handle a socket connection request from web client
io.on("connection", (client) => {
    // Creating the entity
    const thisEntity = {};

    // Setting the id for the entity
    const id = client.id;

    // First ping to the client (can add extra attributes later if needed!)
    client.emit("init", { id: id, map: map });
    client.on("init", client => {
        console.log(`Client connected with ID: \x1b[33m${client.id}\x1b[0m`);
    });

    client.on("join", () => {
        entities.push(thisEntity);
    });

    client.on("exit", () => {
        const index = entities.indexOf(thisEntity);
        if (index >= 0) {
            entities.splice(index, 1);
        }
    });

    // On client disconnect
    client.on("disconnect", (reason) => {
        console.log(`Client disconnected with ID: \x1b[33m${thisEntity.id}\x1b[0m`);
        console.log(reason);
        const index = entities.indexOf(thisEntity);
        if (index >= 0) {
            entities.splice(index, 1);
        };
    });

    // On client emit position to server
    client.on("getclientdata", client => {
        Object.assign(thisEntity, client);
    });

    client.on("interact", packet => {
        io.to(packet.receiver).emit("interact", packet.data);
    });

    client.on("savemap", map => {
        fs.writeFile("map.json", JSON.stringify(map), err => {
            if (err) {
                console.error(err);
                return;
            }
        });
    });

    client.on("loadmap", () => {
        client.emit("loadmap", map);
    });
});

// FROM const entities, will remove messages with a timestamp over some number
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