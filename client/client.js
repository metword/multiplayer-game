const socket = io();
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const serverEntities = [];
const tps = 1000 / 60;
const keyPresses = {
    up : false,
    left : false,
    down : false,
    right : false
}

class Entity {
    x;
    y;
    constructor(x , y) {
        this.x = x;
        this.y = y;
        //console.log(`CREATING ENTITY AT (${x}, ${y})`)
    }
}
const clientEntity = new Entity(0,0);
const velocity = {
    x : 0,
    y : 0,
}

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
    //rendering the player
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(clientEntity.x,clientEntity.y,50,50);
    ctx.fill();

    //renders provided by the server
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
    clientEntity.x += velocity.x;
    clientEntity.y += velocity.y;

    //drag
    velocity.x *= 0.8;
    velocity.y *= 0.8;
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

socket.on("init", () => {
    console.log("Initializing...");
});

socket.on("message", (text) => {

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