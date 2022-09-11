const socket = io();

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const tps = 1000 / 60;
const velocityFactor = 2;
// maybe player size can edit the actual sprite?
const playerRadius = 20;
const playerColor = "rgb(0,255,0)";
const enemyColor = "rgb(255,0,0)";
const devMode = { ray: false, movementent: false , AABB: false};

class Vec {
    x;
    y;
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vec2) {
        return new Vec(this.x + vec2.x, this.y + vec2.y);
    }

    scale(scalar) {
        return new Vec(this.x * scalar, this.y * scalar);
    }

    length() {
        return Math.sqrt(this.lengthSquared());
    }

    lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }
}

class GameObject {
    id;
    name;
    position;
    angle;
    //ALL OTHER ENTITY SPECIFIC DATA IS HELD IN DATA
    data;

    constructor(id = -1, name = error("param", "name"), position = new Vec(0, 0), angle = 0, data = error("param", "data")) {
        // Defaults
        this.id = id;
        this.name = name;
        this.position = position;
        this.angle = angle;
        this.data = data;
    }
}

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
// playerEntity hitbox will be constant 20 units
const client = new GameObject(undefined, "playerEntity", undefined, undefined, { heldItem: "fists", messageQueue: [] });

let ticks = 0;
let serverEntities = [];
const tiles = [];

const velocity = new Vec(0, 0);
const cameraCenter = new Vec(0, 0);
const camera = new Vec(-canvas.width * 0.5, -canvas.height * 0.5);
const mousePos = new Vec(0, 0);

//to add items to hotbar we just need to do /push("item");
const hotbar = ["fists", "bow"];
let hotbarSlot = 0;

//screens: game, chat,
//future? menu
let currentScreen = "game";
let chatInput = "";

createMap();

function createMap() {
    //tiles.push(new GameObject(undefined, "rigidBody", new Vec(100, 100), 0, {shape:"circle", radius:100}));
    tiles.push(new GameObject(undefined, "rigidBody", new Vec(100, -100), 0, { shape: "circle", radius: 100 }));
    tiles.push(new GameObject(undefined, "rigidBody", new Vec(-100, 100), 0, { shape: "circle", radius: 100 }));
    tiles.push(new GameObject(undefined, "rigidBody", new Vec(-100, -100), 0, { shape: "circle", radius: 100 }));

    tiles.push(new GameObject(undefined, "rigidBody", new Vec(200, 200), 0, { shape: "rectangle", width: 100, height: 100 }));
}

function doCollisions() {
    for (const tile of tiles) {
        if (AABB(tile)) {
            resolveCollision(tile);
        }
    }
}

function AABB (tile) {
    // Our AABB hitbox is twice as large as our normal
    const clientX = client.position.x - playerRadius * 2;
    const clientY = client.position.y - playerRadius * 2;
    let tileX = tile.position.x;
    let tileY = tile.position.y;
    let tileWidth = tile.data.width;
    let tileHeight = tile.data.height;
    if (tile.data.shape === "circle") {
        tileX -= tile.data.radius;
        tileY -= tile.data.radius;
        tileWidth = tile.data.radius * 2;
        tileHeight = tile.data.radius * 2;
    }
    // AABB check
    if (clientX + playerRadius * 4 >= tileX &&
        tileX + tileWidth >= clientX &&
        clientY + playerRadius * 4 >= tileY &&
        tileY + tileHeight >= clientY
        ) {
        if (devMode.AABB) {
            console.log("AABB");
        }
        return true;
    }
    return false
}

//TODO: OPTIMIZATIONS FOR THIS CODE ONLY DO COLLISION CALCULATIONS FOR OBJECTS WHICH ARE CLOSE
function resolveCollision(tile) {
    const clientX = client.position.x;
    const clientY = client.position.y;
    const tileX = tile.position.x;
    const tileY = tile.position.y;

    if (tile.data.shape === "circle") {
        const distanceBetween = new Vec(clientX - tileX, clientY - tileY);
        const sumRadius = playerRadius + tile.data.radius;

        if (distanceBetween.lengthSquared() <= sumRadius * sumRadius) { //collision detected
            const hypo = distanceBetween.length();
            client.position.x = tileX + distanceBetween.x / hypo * (sumRadius + 1);
            client.position.y = tileY + distanceBetween.y / hypo * (sumRadius + 1);
        }
    } else if (tile.data.shape === "rectangle") {
        const width = tile.data.width;
        const height = tile.data.height;
        const nearestPoint = new Vec(Math.max(tileX, Math.min(tileX + width, clientX)), Math.max(tileY, Math.min(tileY + height, clientY)));
        const distanceToCircle = new Vec(nearestPoint.x - clientX, nearestPoint.y - clientY);

        //console.log(nearestPoint);
        //console.log(distanceToCircle);
        //console.log(distanceToCircle.lengthSquared());

        if (distanceToCircle.lengthSquared() <= playerRadius * playerRadius) {
            const magnitude = distanceToCircle.length();
            const unitVector = distanceToCircle.scale(-1 / magnitude);
            const overlap = Math.abs(playerRadius - magnitude);
            const displacementVector = unitVector.scale(overlap);
            //console.log(displacementVector);
            client.position.x += displacementVector.x || 0;
            client.position.y += displacementVector.y || 0;
        }
    }
}

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
    //console.log(camera.x+" " + camera.y);
    //ticks++;

    updatePosition();
    doCollisions();
    updateCamera();
    updateMouseAngle();

    render();

}

setInterval(clientLoop, tps);

function render() {
    clearCanvas();

    //WILL BE DRAWN RELATIVE TO 0,0 USING THE CONTEXT OF THE CAMERA
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawCircle(0, 0, 5, "black");

    //renders provided by the server
    for (const entity of serverEntities) {
        if (entity.id !== client.id) {
            if (entity.name = "playerEntity") {
                drawPlayer(entity);
            } else if (entity.name = "bullet") {
                drawBullet(entity);
            }
        }
    }
    for (const tile of tiles) {
        drawTile(tile);
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

//ADD LAYERING
//ADD BOW
//TODO, make drawPlayer take an entity and draw it as well as it can based on what it has as properties.
function drawPlayer(entity) {
    let color;
    if (entity.id === client.id) {
        color = "rgb(0,255,0)";
    } else {
        color = "rgb(255,0,0)";
    }

    //DRAWN RELATIVE TO THE PLAYERS POSITION
    ctx.save();
    ctx.translate(entity.position.x, entity.position.y);

    drawChatBubble(entity.data.messageQueue, color);
    if (devMode.AABB) {
        drawRectangle(-40,-40, 80, 80, "red", false);
    }

    ctx.rotate(-entity.angle);

    if (entity.id === client.id && devMode.ray) {
        drawRectangle(-1000, -1, 2000, 2, "red");
    }
    //draw body
    drawCircle(0, 0, 20, color, "black");

    if (entity.data.heldItem === "fists") {
        drawCircle(15, 15, 10, color, "black");
        drawCircle(15, -15, 10, color, "black");
    } else if (entity.data.heldItem === "bow") {
        drawBow();
        //drawCircle(15, 15, 10, color, "black");
        //drawCircle(15, -15, 10, color, "black");
    }

    ctx.restore();
}

function drawTile(tile) {
    if (tile.data.shape === "circle") {
        drawCircle(tile.position.x, tile.position.y, tile.data.radius, "red");
        if (devMode.AABB) {
            drawRectangle(tile.position.x-tile.data.radius, tile.position.y-tile.data.radius, tile.data.radius*2, tile.data.radius*2, "red", false);
        }
    } else if (tile.data.shape === "rectangle") {
        drawRectangle(tile.position.x, tile.position.y, tile.data.width, tile.data.height, "red");
    }
    
}

function drawCircle(x, y, radius, baseColor = "black", strokeColor) {
    ctx.beginPath();

    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = baseColor;
    ctx.fill();

    if (strokeColor !== undefined) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }
}

function drawRectangle(x, y, width, height, color = "black", fill = true) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.rect(x, y, width, height);
    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function drawGun(length) {
    //drawRectangle(15,-4,15+length,8,"black");
    ctx.beginPath();

    ctx.arc(15, 0, 5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(15 + length, -5);
    ctx.arc(15 + length, 0, 5, Math.PI * 1.5, Math.PI * 0.5);
    ctx.lineTo(15, 5);
    ctx.fillStyle = "black";
    ctx.fill();

    //ctx.lineWidth = 2;
    //ctx.strokeStyle = "black";
    //ctx.stroke();
}

function drawBow() {
    ctx.beginPath();
    ctx.arc(playerRadius*2,-playerRadius*2,playerRadius, Math.PI, Math.PI * 0.75, true);
    ctx.arc(playerRadius*0.5,0,playerRadius*1.5, Math.PI * 1.75, Math.PI * 0.25, false);
    ctx.arc(playerRadius*2,playerRadius*2,playerRadius, Math.PI * 1.25, Math.PI, true);
    ctx.arc(playerRadius*3.75,playerRadius*2, playerRadius*2.75, Math.PI, Math.PI * 1.1, false);
    ctx.arc(-playerRadius*0.25,0,playerRadius * 1.75, Math.PI * 0.2, -Math.PI * 0.2, true);
    ctx.arc(playerRadius*3.75,-playerRadius*2, playerRadius*2.75, Math.PI*0.9, Math.PI, false);

    
    
    //ctx.strokeStyle = "black";
    //ctx.lineWidth = 4;
    //ctx.stroke();
    ctx.fillStyle = "brown";
    ctx.fill();
    
}

function drawArrow(entity) {

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
    if (!devMode.movementent) {
        if (keyPresses.up) {
            velocity.y -= velocityFactor;
        }
        if (keyPresses.left) {
            velocity.x -= velocityFactor;
        }
        if (keyPresses.down) {
            velocity.y += velocityFactor;
        }
        if (keyPresses.right) {
            velocity.x += velocityFactor;
        }

        //update pos
        client.position.x += velocity.x;
        client.position.y += velocity.y;

        //drag
        velocity.x *= 0.8;
        velocity.y *= 0.8;

        if (Math.abs(velocity.x) < 1) velocity.x = 0;
        if (Math.abs(velocity.y) < 1) velocity.y = 0;
    } else {
        if (keyPresses.up) {
            client.position.y -= 2;
            velocity.y = -1;
        }
        if (keyPresses.left) {
            client.position.x -= 2;
            velocity.x = -1;
        }
        if (keyPresses.down) {
            client.position.y += 2;
            velocity.y = 1;
        }
        if (keyPresses.right) {
            client.position.x += 2;
            velocity.x = 1;
        }
    }
    //console.log(client.position.x, + " " +   client.position.y);
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
    //client.angle = Math.atan2(- mousePos.y + client.position.y - camera.y, mousePos.x - client.position.x + camera.x);
    //console.log(client.angle * 180 / Math.PI);
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
                const messagePackage = { message: chatInput, time: new Date().getTime() };
                client.data.messageQueue.push(messagePackage);
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
            case "q": client.data.heldItem = nextItem();
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
    socket.emit("init", client);
});

socket.on("getclientdata", () => {
    //TODO: EMIT THE WHOLE ENTITY HERE
    socket.emit("getclientdata", client);
});

socket.on("sendserverdata", (entitites) => {
    serverEntities = entitites;
});

function error(type, data) {
    if (type === "param") {
        throw new Error(`Parameter '${data}' is a required parameter for this function!`);
    } else {
        throw new Error();
    }
}