const socket = io();

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const tps = 1000 / 60;
const color = "rgb(0,255,0)";

let clientId = undefined;
let serverEntities = null;

const keyPresses = {
    up : false,
    left : false,
    down : false,
    right : false
}

class Vec {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

const clientPos = new Vec(0,0);
const velocity = new Vec(0,0);
const mousePos = new Vec(0,0);
let mouseAngle = 0;

window.onload = window.onresize = function () {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
}

// CLIENT DUTY!!!
// send position when server requests it [socket.emit("position", obj)]
// render client entity
// render server entities received from server [io.emit("entities", obj)]
//
// eventually handle camera

function clientLoop() {
    updatePosition();
    render();
}

setInterval(clientLoop, tps);

function render() {

    clearCanvas();

    //renders provided by the server
    if (serverEntities !== null) {
        //console.log("SERVER ENTITIES !== NULL")
        for (const entity of serverEntities) {
            if (entity.id !== clientId  && entity.position !== null) {
                drawPlayer(entity.position.x, entity.position.y, -entity.mouseAngle ,"rgb(255,0,0)");
            }
        }
    }

    drawPlayer(clientPos.x,clientPos.y, -mouseAngle, color);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
//////////////////
//  RENDERING   //
//////////////////
function drawPlayer(x, y, angle, color) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);

    ctx.beginPath();

    ctx.arc(0, 0, 20, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.stroke();

    drawGun();

    ctx.restore();
}
function drawHand(count) {
    if (count === 1) {
        
    } else if (count === 2) {

    } else {

    }
}

function drawGun() {
    ctx.beginPath();

    ctx.arc(15, 0, 5, Math.PI/2, 3*Math.PI/2);
    ctx.lineTo(30, -5);
    ctx.arc(30, 0, 5, 3*Math.PI/2, Math.PI/2);
    ctx.lineTo(15, 5);
    ctx.fillStyle = "brown";
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.stroke();
}

function updatePosition() {
    //read keys
    if (keyPresses.up) {
        velocity.y-=4;
    }
    if (keyPresses.left) {
        velocity.x-=4;
    }
    if (keyPresses.down) {
        velocity.y+=4;
    }
    if (keyPresses.right) {
        velocity.x+=4;
    }
    
    //update pos
    clientPos.x += velocity.x;
    clientPos.y += velocity.y;

    //drag
    velocity.x *= 0.8;
    velocity.y *= 0.8;

    if (Math.abs(velocity.x) < 1) velocity.x = 0;
    if (Math.abs(velocity.y) < 1) velocity.y = 0;

    //update mouse angle
    mouseAngle = Math.atan2(clientPos.y-mousePos.y, mousePos.x-clientPos.x);
}

window.addEventListener("keydown", (key) => {
    switch(key.key) {
        case "w" : keyPresses.up = true;
        break;
        case "a" : keyPresses.left = true;
        break;
        case "s" : keyPresses.down = true;
        break;
        case "d" : keyPresses.right = true;
        break;
        case "t" : console.log("open chat!");
        break;
    }
});

window.addEventListener("keyup", (key) => {
    switch(key.key) {
        case "w" : keyPresses.up = false;
        break;
        case "a" : keyPresses.left = false;
        break;
        case "s" : keyPresses.down = false;
        break;
        case "d" : keyPresses.right = false;
        break;
    }
});

window.addEventListener("mousemove", (mouse) => {
    mousePos.x = mouse.clientX;
    mousePos.y = mouse.clientY;

});

document.querySelector("#canvas").addEventListener("click", (click) => {
    console.log("click!");
});

socket.on("init", (id) => {
    clientId = id;
    console.log(`Joined with id: ${clientId}`);
});

socket.on("getplayer", () => {
    socket.emit("playerdata", clientPos, mouseAngle);
});

socket.on("allpos", (entitites) => {
    serverEntities = entitites;
});
/*const log = (text) => {
    const list = document.querySelector("#message-history");
    const elem = document.createElement("div");
    elem.innerHTML = text;
    elem.className = "chat-message";
    list.prepend(elem);
}

const onChatSubmitted = (e) => {
    e.preventDefault();
    const input = document.querySelector("#input");
    const text = input.value;
    input.value = "";
    socket.emit("message", text);
}

(() => {
    socket.on("message", (text) => {
        log(text);
    });
    document
    .querySelector("#chat-widget")
    .addEventListener("submit", onChatSubmitted);

})();*/