window.onload = (function () {

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

    class AngleHelper {
        anglesPerRev;
        sinTable;
        cosTable;

        //creates subDivision elements in the arrays sinTable and cosTable
        constructor(anglesPerRev) {
            this.anglesPerRev = anglesPerRev;
            this.sinTable = [];
            this.cosTable = [];
            for (let i = 0; i < this.anglesPerRev; i++) {
                this.sinTable.push(Math.sin(i / this.anglesPerRev * 2 * Math.PI));
                this.cosTable.push(Math.cos(i / this.anglesPerRev * 2 * Math.PI));
            }
        }
        sin(angleRadians) {
            return this.sinTable[this.subDivision(angleRadians)];
        }
        cos(angleRadians) {
            return this.cosTable[this.subDivision(angleRadians)];
        }
        //converts a radian angle to the closest (floor) subdivision of a full revolution around th circle
        subDivision(angleRadians) {
            return Math.floor(0.5 * this.anglesPerRev * angleRadians / Math.PI) % this.anglesPerRev;
        }
        clamp(angleRadians) {
            if (angleRadians < 0) {
                angleRadians = Math.PI * 2 + angleRadians;
            }
            while (angleRadians > Math.PI * 2) {
                angleRadians -= Math.PI * 2;
            }
            console.log(angleRadians);
            return angleRadians;
        }
    }

    //when we draw the image, we're giving it the whole thing with a little dot in the middle, if we just draw it at 0, 0 it doesnt make any sense.
    //we draw at (0 - centerX, 0 - centerY)
    //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    class Sprite {
        x;
        y;
        centerX;
        centerY;
        width;
        height;
        numAngles;

        translation;
        rotation;
        angleHelper;
        constructor(x, y, centerX, centerY, width, height, numAngles, translation = new Vec(0, 0), rotation = 0, angleHelper = new AngleHelper(numAngles)) {
            //represent the x and y starting coordinates on the rendered canvas
            this.x = x;
            this.y = y;
            this.centerX = centerX;
            this.centerY = centerY;
            this.width = width;
            this.height = height;
            this.numAngles = numAngles;

            this.translation = translation;
            this.rotation = rotation;
            this.angleHelper = angleHelper
        }
        rotate(angleRadians) {
            //CLAMPED BETWEEN 0 AND 2PI
            angleRadians = this.angleHelper.clamp(angleRadians);
            //grid fixed rotation
            const indexY = Math.floor(this.numAngles * angleRadians * 0.5 / Math.PI) % this.numAngles;
            const newY = indexY * this.height;
            return new Sprite(this.x, newY, this.centerX, this.centerY, this.width, this.height, this.numAngles, this.translation, angleRadians, this.angleHelper); 
        }
        translate(x, y) { // xcosA + -ysinA, xsinA + ycosA
            const translation = new Vec(0, 0);
            translation.x =  x * this.angleHelper.cos(this.rotation) + y * this.angleHelper.sin(this.rotation);
            translation.y = -x * this.angleHelper.sin(this.rotation) + y * this.angleHelper.cos(this.rotation);
            return new Sprite(this.x, this.y, this.centerX, this.centerY, this.width, this.height, this.numAngles, translation, this.rotation, this.angleHelper);
        }
    }

    class SpriteManager {
        sprites;

        nextOpenColPixel;
        spriteSheet;
        ctx;
        constructor() {
            this.sprites = [];
            this.empty = new Sprite(0,0,0,0,0,0,1);

            this.nextOpenColPixel = 0;
            this.spriteSheet = document.createElement("canvas");
            this.spriteSheet.width = 0;
            this.spriteSheet.height = 0;
            this.ctx = this.spriteSheet.getContext("2d");
        }
        get(index) {
            return this.sprites[index] || this.empty;
        }
        loadImage(source, rows, cols, width, height, numAngles) {
            this.spriteSheet.width += rows * cols * width;
            this.spriteSheet.height = Math.max(this.spriteSheet.height, numAngles * height);
            const image = new Image();
            image.src = source;
            image.addEventListener("load", (e) => {
                this.renderImage(image, rows, cols, width, height, numAngles);
            });
        }
        renderImage(image, rows, cols, width, height, numAngles) {
            if (numAngles <= 1) numAngles = 1;

            //row major
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {

                    let nextSprite;
                    if (numAngles > 1) {
                        nextSprite = new Sprite(this.nextOpenColPixel, 0, Math.floor(width * 0.5), Math.floor(height * 0.5), width, height, numAngles);
                    } else {
                        nextSprite = new Sprite(this.nextOpenColPixel, 0, 0, 0, width, height, 1);
                    }
                    this.sprites.push(nextSprite);

                    for (let k = 0; k < numAngles; k++) {
                        this.ctx.save();

                        //we want to put 0,0 at where we're drawing our next image.
                        this.ctx.translate(this.nextOpenColPixel + nextSprite.centerX, k * height + nextSprite.centerY);
                        this.ctx.rotate(-k * 2 * Math.PI / numAngles);

                        // Drawing ONTO SpriteSheet.canvas FROM the image we loaded
                        this.ctx.drawImage(image, j * width, i * height, width, height, 0 - nextSprite.centerX, 0 - nextSprite.centerY, width, height);
                        this.ctx.restore();
                    }
                    this.nextOpenColPixel += width;
                }
            }
        }
    }

    class Renderer {
        ctx;
        spriteSheet;
        constructor(ctx, spriteSheet) {
            this.ctx = ctx;
            this.spriteSheet = spriteSheet
        }

        drawSprite(sprite) {
            this.ctx.drawImage(this.spriteSheet, sprite.x, sprite.y, sprite.width, sprite.height, 
                sprite.translation.x - sprite.centerX, sprite.translation.y - sprite.centerY, sprite.width, sprite.height);
        }
    }

    const keyPresses = {
        up: false,
        left: false,
        down: false,
        right: false,
        shift: false
    }
    
    const socket = io();
    const devMode = { ray: false, movementent: false, AABB: false };

    const canvas = document.querySelector("#canvas");
    const ctx = canvas.getContext("2d");
    const spriteManager = new SpriteManager();
    spriteManager.loadImage("/sprites1.png", 3, 4, 200, 200, 64);
    const renderer = new Renderer(ctx, spriteManager.spriteSheet);
    
    const tps = 1000 / 60;
    const velocityFactor = 2;
    const playerRadius = 20;

    //THIS ENTITY
    // playerEntity hitbox will be constant 20 units
    const client = new GameObject(undefined, "playerEntity", undefined, undefined, { heldItem: "fists", messageQueue: [] });

    let serverEntities = [];
    const tiles = [];

    const velocity = new Vec(0, 0);
    const cameraCenter = new Vec(0, 0);
    const camera = new Vec(-canvas.width * 0.5, -canvas.height * 0.5);
    const mousePos = new Vec(0, 0);

    //to add items to hotbar we just need to do /push("item");
    const hotbar = ["fists", "pickaxe", "sword"];
    let hotbarSlot = 0;

    //screens: game, chat,
    //future? menu
    let currentScreen = "game";
    let chatInput = "";

    //TODO-> PRE LOAD ALL SPRITE ROTATIONS ON A CANVAS SO THAT PERFORMANCE DOESNT TAKE A HIT DUE TO LOTS OF IMAGE ROTATIONS!!!

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

    function AABB(tile) {
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
    // CAMERA IMPLEMENTATION - DONE

    // MORE ROBUST ENTITY IMPLEMENTATION - DONE
    // COLLISIONS - DONE

    //IMPLEMENT VARIABLE TIME STEP
    function clientLoop() {
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
                } else if (entity.name = "arrow") {

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

        //CHAT BUBBLE
        drawChatBubble(entity.data.messageQueue, color);

        //DRAW PLAYER BODY
        renderer.drawSprite(spriteManager.get(0));
        renderer.drawSprite(spriteManager.get(2));

        if (entity.data.heldItem === "pickaxe") {
            renderer.drawSprite(spriteManager.get(4).rotate(entity.angle + Math.PI * 0.5).translate(-15, 15));
        } else if (client.data.heldItem === "sword") {
            renderer.drawSprite(spriteManager.get(8).rotate(entity.angle + Math.PI * 0.5).translate(-15, 15));
        }

        //DRAW HANDS
        //console.log(entity.angle);
        renderer.drawSprite(spriteManager.get(1).rotate(entity.angle).translate(15, 15));
        renderer.drawSprite(spriteManager.get(3).rotate(entity.angle).translate(15, 15));

        renderer.drawSprite(spriteManager.get(1).rotate(entity.angle).translate(15, -15));
        renderer.drawSprite(spriteManager.get(3).rotate(entity.angle).translate(15, -15));


        //HITBOX
        if (devMode.AABB) {
            drawRectangle(-40, -40, 80, 80, "red", false);
        }
        ctx.restore();
    }

    function drawTile(tile) {
        if (tile.data.shape === "circle") {
            drawCircle(tile.position.x, tile.position.y, tile.data.radius, "red");
            if (devMode.AABB) {
                drawRectangle(tile.position.x - tile.data.radius, tile.position.y - tile.data.radius, tile.data.radius * 2, tile.data.radius * 2, "red", false);
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
        //let angle = Math.atan2(- mousePos.y + client.position.y - camera.y, mousePos.x - client.position.x + camera.x);
        //if (angle < 0) {
        //    angle = Math.PI * 2 + angle;
        //}
        //client.angle = angle;
        client.angle = Math.atan2(- mousePos.y + client.position.y - camera.y, mousePos.x - client.position.x + camera.x);
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

    function error(type, data) {
        if (type === "param") {
            throw new Error(`Parameter '${data}' is a required parameter for this function!`);
        } else {
            throw new Error();
        }
    }

    window.addEventListener("load", (event) => {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
    });

    window.addEventListener("resize", (event) => {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
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

})();
