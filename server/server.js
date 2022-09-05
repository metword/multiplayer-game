const io = require("socket.io")();

//const http = require("http");
//const express = require("express");

//const app = express();

//app.use(express.static(`${__dirname}/../client`))

//const server = http.createServer(app);


io.on("connection", client => {
    client.emit("message", "You are connected!");

    client.on("message", (text) => {
        io.emit("message", text);
    });
});

io.listen(process.env.PORT || 3000);

//server.on("error", (err) => {
//    console.error(err);
//});

//heroku
//server.listen(process.env.PORT || 49490, () => {
//    console.log("Server is running!");
//});
