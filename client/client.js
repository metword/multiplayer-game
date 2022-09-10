const socket = io();

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const tps = 1000 / 60;
const playerColor = "";
const enemyColor = "rgb(255,0,0)";

class Vec {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

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

const keyPresses = {
    up: false,
    left: false,
    down: false,
    right: false,
    shift: false
}

window.onload = window.onresize = function () {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
}

//THIS ENTITY
const client = new Entity();

let ticks = 0;
let serverEntities = [];

const velocity = new Vec(0, 0);
const cameraCenter = new Vec(0, 0);
const camera = new Vec(-canvas.width * 0.5, -canvas.height * 0.5);
const mousePos = new Vec(0, 0);

//to add items to hotbar we just need to do /push("item");
const hotbar = ["fists", "gun"];
let hotbarSlot = 0;

//screens: game, chat,
//future? menu
let currentScreen = "game";
let chatInput = "";


// CLIENT DUTY!!!
// send position when server requests it [socket.emit("position", obj)]
// render client entity
// render server entities received from server [io.emit("entities", obj)]
//
// eventually handle camera

//TO IMPLEMENT: 
// MORE ROBUST DRAWING IMPLEMENTATION - DONE
// SWAP BETWEEN GUN AN FISTS - DONE
// CHAT - DONE
// CAMERA IMPLEMENTATION - When we're moving

// FIRE GUN ON CLICK
// 
// MORE ROBUST ENTITY IMPLEMENTATION
// COLLISIONS

//IMPLEMENT VARIABLE TIME STEP
function clientLoop() {
    //ticks++;

    updatePosition();
    updateCamera();
    updateMouseAngle();
    render();

}

setInterval(clientLoop, tps);

function render() {
    clearCanvas();

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawCircle(0,0,5,"black");

    //renders provided by the server
    for (const entity of serverEntities) {
        if (entity.id !== client.id) {
            drawPlayer(entity);
        }
    }
    drawPlayer(client);

    ctx.restore();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
//////////////////
//  RENDERING   //
//////////////////


//TODO, make drawPlayer take an entity and draw it as well as it can based on what it has as properties.
function drawPlayer(entity) {
    let color;
    if (entity.id === client.id) {
        color = "rgb(0,255,0)";
    } else {
        color = "rgb(255,0,0)";
    }

    ctx.save();
    ctx.translate(entity.position.x, entity.position.y);

    drawChatBubble(entity.messageQueue, color);

    ctx.rotate(-entity.mouseAngle);

    //draw body
    drawCircle(0, 0, 20, color, "black");

    if (entity.heldItem === "fists") {
        drawCircle(15, 15, 10, color, "black");
        drawCircle(15, -15, 10, color, "black");
    } else if (entity.heldItem === "gun") {
        drawGun(20);
        drawCircle(15, 3, 10, color, "black");
    }

    ctx.restore();


}

function drawCircle(offsetX, offsetY, radius, baseColor, strokeColor) {
    ctx.beginPath();

    ctx.arc(offsetX, offsetY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = baseColor;
    ctx.fill();

    if (strokeColor !== undefined) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }
}

function drawGun(length) {
    ctx.beginPath();

    ctx.arc(15, 0, 5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(15 + length, -5);
    ctx.arc(15 + length, 0, 5, Math.PI * 1.5, Math.PI * 0.5);
    ctx.lineTo(15, 5);
    ctx.fillStyle = "orange";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke();
}

//we'll have to make a function similar to breakrenderedchatmessages...
function drawChatBubble(messages, color) {
    ctx.font = 'bold 16px sans-serif';
    for (let i = messages.length - 1; i >= 0; i--) {

        const fadeTime = 3000;

        const timeLeft = fadeTime + messages[i].time - new Date().getTime();
        if (timeLeft > 0) {
            const j = messages.length - 1 - i;
            const message = messages[i].message
            const width = (ctx.measureText(message)).width;
            const left = -width * 0.5;
            const top = j * -30 - 40;
            const radius = 5;

            //if more than a second left, our alpha factor is 1, else 
            const alpha = timeLeft > 1000 ? 1 : timeLeft * 0.001;

            ctx.beginPath();
            ctx.arc(left, top, radius, Math.PI * 0.5, Math.PI);
            ctx.lineTo(left - radius, top - 16);
            ctx.arc(left, top - 16, radius, Math.PI, Math.PI * 1.5);
            ctx.lineTo(left + width, top - 16 - radius);
            ctx.arc(left + width, top - 16, radius, Math.PI * 1.5, 0);
            ctx.lineTo(left + width + radius, top);
            ctx.arc(left + width, top, radius, 0, Math.PI * 0.5);
            ctx.lineTo(left, top + radius);
            ctx.fillStyle = `rgba(0,0,0,${alpha * 0.2})`;
            ctx.fill();

            ctx.fillStyle = `${color.substring(0, color.length - 1)},${alpha})`;
            ctx.fillText(message, left, top);
        }
    }
}

// CLIENT HAX --------------------- 
function updatePosition() {
    //read keys
    if (keyPresses.up) {
        velocity.y -= 4;
    }
    if (keyPresses.left) {
        velocity.x -= 4;
    }
    if (keyPresses.down) {
        velocity.y += 4;
    }
    if (keyPresses.right) {
        velocity.x += 4;
    }

    //update pos
    client.position.x += velocity.x;
    client.position.y += velocity.y;

    //drag
    velocity.x *= 0.8;
    velocity.y *= 0.8;

    if (Math.abs(velocity.x) < 1) velocity.x = 0;
    if (Math.abs(velocity.y) < 1) velocity.y = 0;

    //update mouse angle
}

function updateCamera() {
    //1   => camera tracks player 1-1
    //0.5 => camera accelerates at half speed
    //0   => camera is has 0 acceleration
    const smoothness = 0.1;

    const dx = client.position.x - cameraCenter.x;
    const dy = client.position.y - cameraCenter.y;
    //camera.x += (client.position.x - camera.x) * smoothness;
    cameraCenter.x += dx * smoothness;
    cameraCenter.y += dy * smoothness;

    //console.log(`CAMERA (${camera.x}, ${camera.y})`);
    //console.log(`PLAYER (${client.position.x}, ${client.position.y})`);
    camera.x = cameraCenter.x - (canvas.width * 0.5);
    camera.y = cameraCenter.y - (canvas.height * 0.5);

}

function updateMouseAngle() {
    client.mouseAngle = Math.atan2(-camera.y - mousePos.y + client.position.y , camera.x + mousePos.x - client.position.x);
}

function nextItem() {
    hotbarSlot++;
    if (hotbarSlot == hotbar.length) {
        hotbarSlot = 0;
    }
    return hotbar[hotbarSlot];
}

window.addEventListener("keydown", (key) => {
    if (currentScreen === "chat") {
        switch (key.key) {
            case "Enter": {
                //TODO, MAKE GETPLAYER HANDLE THIS maybe making the server do this makes more sense tho
                //socket.emit("chat", messagePackage);
                const messagePackage = {message: chatInput, time: new Date().getTime()};
                client.messageQueue.push(messagePackage);
                chatInput = "";
                currentScreen = "game";
            }
                break;
            case "Backspace": {
                chatInput = chatInput.substring(0, chatInput.length - 1);
                //console.log(chatInput);
            }
                break;
            case "Shift": {
                keyPresses.shift = true;
            }
                break;
            case "Escape": {
                chatInput = "";
                currentScreen = "game";
            }
                break;

            default: {
                if (key.key.length === 1) {
                    if (keyPresses.shift) {
                        chatInput += key.key.toUpperCase();
                    } else {
                        chatInput += key.key;
                    }
                    //console.log(chatInput);
                }
            }
        }
    } else if (currentScreen === "game") {
        switch (key.key) {
            case "w": keyPresses.up = true;
                break;
            case "a": keyPresses.left = true;
                break;
            case "s": keyPresses.down = true;
                break;
            case "d": keyPresses.right = true;
                break;
            case "t": currentScreen = "chat";
                break;
            case "q": client.heldItem = nextItem();
                break;
        }
    }
});

window.addEventListener("keyup", (key) => {
    switch (key.key) {
        case "w": keyPresses.up = false;
            break;
        case "a": keyPresses.left = false;
            break;
        case "s": keyPresses.down = false;
            break;
        case "d": keyPresses.right = false;
            break;
        case "Shift": keyPresses.shift = false;
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
    client.id = id;
    console.log(`Joined with id: ${client.id}`);
});

socket.on("getplayer", () => {
    //TODO: EMIT THE WHOLE ENTITY HERE
    socket.emit("clientdata", client);
});

socket.on("loadplayers", (entitites) => {
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