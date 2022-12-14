/**
 * TODO: 
 * BETTER MAP WITH RESOURCE TILES (PART 1 DONE?)
 * PLAYER COLOR SELECTION
 * PLAYER INTERPOLATION (DOWN TO 20 SERVER TICKS PER SECOND TO SAVE RAM)
 * 
 * GAMEPLAY FEATURES:
 * CRAFTING TODO ADD CRAFTING SPRITES TO HUD INSTEAD OF TEXT...
 * MOBS WITH AI TO ATTACK THE PLAYER
 * COORDINATE SYSTEM WHICH CAN BE TOGGLED
 * TOGGLE DEBUG FEATURES FROM INGAME
 * FIX JANKY DIAMOND SPRITE
 * RED HIGHLIGHT WEIRD ON CERTAIN RELOADS...
 * HEALTH BAR HAS A WEIRD ASPECT RATIO (0 HP WOULD BE A CIRCLE)
 * AI MONSTERS THAT MAKE IT HARD TO GET THINGS LIKE DIAMONDS...
 * 
 * 
 * FIXME:
 * CRASH ON RELOAD (ERROR X NOT DEFINED)
 * CIRCLE TILES ARE NOT THE PROPER RADIUS
 * 
 * MAKE THE GAME A GAME:
 * Map with water in the center, you spawn in the water with some invinsibility frames and then you must leave the center of the map to get better resources but you run out of water tho...
 * Map with food. You need food every so often to survive.
 * Map with KOTH in the center. Diamond resource is in the middle and strong mobs with ai guard it.
 *                                                                                                                                                                                                                                                         
 * SCREEN CLASS TO HOLD ALL SCREENS
 * UNPACK SCREEN - REMOVE EVENT LISTENERS
 * UNPACK BUTTONS - REMOVE EVENT LISTENERS OF EACH OF THE BUTTONS
 * EACH SCREEN WILL HAVE ITS OWN RENDER METHOD AND CAN BE CALLED FROM THE CURRENT SCREEN CLASS
 */

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

        componentSize() {
            return Math.abs(this.x) + Math.abs(this.y);
        }
    }

    class Rectangle {
        x;
        y;
        width;
        height;
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
    }

    class Circle {
        x;
        y;
        radius;
        constructor(x, y, radius) {
            this.x = x;
            this.y = y;
            this.radius = radius;
        }
    }

    class GameObject {
        id;
        name;
        position;
        angle;
        //ALL OTHER ENTITY SPECIFIC DATA IS HELD IN DATA
        data;

        constructor(id = -1, name = error("Name parameter is required!"), position = new Vec(0, 0), angle = 0, data = error("Data parameter is required!")) {
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
        sin(angleRadians) { //MUST BE CLAMPED BEFORE USING
            return this.sinTable[this.subDivision(this.clamp(angleRadians))];
        }
        cos(angleRadians) {
            return this.cosTable[this.subDivision(this.clamp(angleRadians))];
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
            const changeAngle = this.angleHelper.clamp(angleRadians);
            const totalAngle = this.angleHelper.clamp(this.rotation + changeAngle);

            //EXISTING TRANSLATION BEING ROTATED BY THE CHANGE_ANGLE
            const translation = new Vec(this.translation.x, this.translation.y);
            translation.x = this.translation.x * this.angleHelper.cos(changeAngle) + this.translation.y * this.angleHelper.sin(changeAngle);
            translation.y = -this.translation.x * this.angleHelper.sin(changeAngle) + this.translation.y * this.angleHelper.cos(changeAngle);

            //Y POS OF OUR IMAGE
            const indexY = Math.floor(this.numAngles * totalAngle * 0.5 / Math.PI) % this.numAngles;
            const newY = indexY * this.height;
            return new Sprite(this.x, newY, this.centerX, this.centerY, this.width, this.height, this.numAngles, translation, totalAngle, this.angleHelper);
        }
        startAt(x = 0, y = 0, startAngle = 0) { // xcosA + -ysinA, xsinA + ycosA
            const translation = new Vec(x, y);
            //Y POS OF OUR IMAGE
            const indexY = Math.floor(this.numAngles * startAngle * 0.5 / Math.PI) % this.numAngles;
            const newY = indexY * this.height;
            return new Sprite(this.x, newY, this.centerX, this.centerY, this.width, this.height, this.numAngles, translation, startAngle, this.angleHelper);
        }
    }

    class SpriteManager {
        sprites;

        nextOpenColPixel;
        spriteSheet;
        ctx;
        constructor() {
            this.sprites = [];
            this.empty = new Sprite(0, 0, 0, 0, 0, 0, 1);

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

    function drawSprite(sprite, context, spriteSheet) {
        context.drawImage(spriteSheet, sprite.x, sprite.y, sprite.width, sprite.height,
            sprite.translation.x - sprite.centerX, sprite.translation.y - sprite.centerY, sprite.width, sprite.height);
    }

    class Item {
        id; //id in the sprite sheet, can handle damage values among other things
        type;
        count;
        spriteId;
        damage;
        gather;
        constructor(id, spriteId = id, type = "item", count = 1, damage = 3, gather = 1) {
            this.id = id;
            this.spriteId = spriteId;

            this.type = type;

            this.count = count;
            this.damage = damage;
            this.gather = gather;
        }

        static empty() { return new Item(-1, undefined, "item", 0) }

        static wood(c) { return new Item(0, undefined, "item", c) }
        static stone(c) { return new Item(1, undefined, "item", c) }
        static iron(c) { return new Item(2, undefined, "item", c) }
        static diamond(c) { return new Item(3, undefined, "item", c) }
        static wood_pickaxe(c) { return new Item(4, 4, "pickaxe", c, 5, 2) }
        static stone_pickaxe(c) { return new Item(5, 5, "pickaxe", c, 5, 3) }
        static iron_pickaxe(c) { return new Item(6, 6, "pickaxe", c, 5, 4) }
        static diamond_pickaxe(c) { return new Item(7, 7, "pickaxe", c, 5, 5) }
        static wood_sword(c) { return new Item(8, 8, "sword", c, 10, 0) }
        static stone_sword(c) { return new Item(9, 9, "sword", c, 15, 0) }
        static iron_sword(c) { return new Item(10, 10, "sword", c, 20, 0) }
        static diamond_sword(c) { return new Item(11, 11, "sword", c, 25, 0) }
    }

    class Tile {
        id;
        name;
        position;
        shape;
        drop;
        color;
        AABB;
        constructor(id = -1, name, position, shape, drop, color) {
            this.id = id;
            this.name = name;
            this.position = position;
            this.shape = shape;
            this.drop = drop;
            this.color = color;
            this.createAABB();
        }

        startAt(x, y) {
            const tile = new Tile(this.id, this.name, new Vec(x, y), this.shape, this.drop, this.color);
            tile.createAABB();
            return tile;
        }

        draw() {
            if (this.id >= 0) {
                if (this.shape.shape === "circle") {
                    drawSprite(tileSprites.get(this.id).startAt(this.position.x, this.position.y), ctx, tileSprites.spriteSheet);
                } else if (this.shape.shape === "rectangle") {
                    drawSprite(tileSprites.get(this.id).startAt(this.position.x + this.width * 0.5, this.position.y + this.height * 0.5), ctx, tileSprites.spriteSheet);
                }
            } else {
                if (this.shape.shape === "circle") {
                    drawCircle(this.position.x, this.position.y, this.shape.radius, this.color);
                } else if (this.shape.shape === "rectangle") {
                    drawRectangle(this.position.x, this.position.y, this.shape.width, this.shape.height, this.color);
                }
            }
            if (devMode.hitboxes) {
                if (this.shape.shape === "circle") {
                    drawCircle(this.position.x, this.position.y, this.shape.radius, "red");
                    if (devMode.AABB) {
                        drawRectangle(this.position.x - this.shape.radius, this.position.y - this.shape.radius, this.shape.radius * 2, this.shape.radius * 2, "red", 2);
                    }
                } else if (this.shape.shape === "rectangle") {
                    drawRectangle(this.position.x, this.position.y, this.shape.width, this.shape.height, "red");
                }
            }
        }

        createAABB() {
            if (this.shape.shape === "circle") {
                this.AABB = new Rectangle(this.position.x - this.shape.radius, this.position.y - this.shape.radius, this.shape.radius * 2, this.shape.radius * 2);
            } else if (this.shape.shape === "rectangle") {
                this.AABB = new Rectangle(this.position.x, this.position.y, this.shape.width, this.shape.height);
            }
        }

        static empty() { return new Tile(-1, "empty", new Vec(0, 0), { shape: "rectangle", width: 0, height: 0 }, { item: Item.empty(), gather: 0 }, "#ffffff00") }

        static water(x, y) { return new Tile(-2, "watertile", new Vec(x, y), { shape: "rectangle", width: 100, height: 100 }, { item: Item.empty(), gather: 0 }, "#0dbdf2") }

        static wall(x, y, width, height, color) { return new Tile(-1, "rigidtile", new Vec(x, y), { shape: "rectangle", width: width, height: height }, { item: Item.empty(), gather: 0 }, color) }

        static wood(x, y, id) {
            if (id === 0) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 75 }, { item: Item.wood(), gather: 0, capacity: 12 }, "#7fff7f");
            else if (id === 1) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 80 }, { item: Item.wood(), gather: 0, capacity: 16  }, "#5fff5f");
            else if (id === 2) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 90 }, { item: Item.wood(), gather: 0, capacity: 20  }, "#3fff3f");
            else if (id === 3) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 90 }, { item: Item.wood(), gather: 0, capacity: 24  }, "#1fff1f");
            else error("ID must be between 0-3, inclusive");
        }
        static stone(x, y, id) {
            if (id === 4) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 60 }, { item: Item.stone(), gather: 1, capacity: 10 }, "#484848");
            else if (id === 5) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 70 }, { item: Item.stone(), gather: 1, capacity: 14 }, "#484848");
            else if (id === 6) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 80 }, { item: Item.stone(), gather: 1, capacity: 18 }, "#484848");
            else if (id === 7) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 85 }, { item: Item.stone(), gather: 1, capacity: 22 }, "#484848");
            else error("ID must be between 4-7, inclusive");
        }
        static iron(x, y, id) {
            if (id === 8) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 70 }, { item: Item.iron(), gather: 2, capacity: 9 }, "#cbcbcb");
            else if (id === 9) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 85 }, { item: Item.iron(), gather: 2, capacity: 12 }, "#cbcbcb");
            else if (id === 10) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 95 }, { item: Item.iron(), gather: 2, capacity: 15 }, "#cbcbcb");
            else if (id === 11) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 110 }, { item: Item.iron(), gather: 2, capacity: 18 }, "#cbcbcb");
            else error("ID must be between 8-11, inclusive");
        }
        static diamond(x, y, id) {
            if (id === 12) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 70 }, { item: Item.diamond(), gather: 3, capacity: 8 }, "#00eaff");
            else if (id === 13) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 80 }, { item: Item.diamond(), gather: 3, capacity: 10 }, "#00eaff");
            else if (id === 14) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 85 }, { item: Item.diamond(), gather: 3, capacity: 12 }, "#00eaff");
            else if (id === 15) return new Tile(id, "rigidtile", new Vec(x, y), { shape: "circle", radius: 95 }, { item: Item.diamond(), gather: 3,capacity: 14 }, "#00eaff");
            else error("ID must be between 12-15, inclusive");
        }
    }

    class ClickableWidget {
        bounds;
        clickAction;
        activeScreen;

        hovering;
        clicking;

        constructor(bounds = new Rectangle(0, 0, 0, 0), clickAction, activeScreen) {
            this.bounds = bounds;
            this.clickAction = clickAction;
            this.activeScreen = activeScreen;

            this.hovering = false;
            this.clicking = false;

            window.addEventListener("mousedown", e => {
                if (this.isActive()) {
                    if (this.hovering) {
                        this.clicking = true;
                    }
                }
            });
            window.addEventListener("mouseup", e => {
                if (this.isActive()) {
                    if (this.hovering && this.clicking) {
                        clickAction();
                    }
                    this.clicking = false;
                }
            });
            window.addEventListener("mousemove", e => {
                if (this.isActive()) {
                    if (rectIntersect(this.bounds, mousePos)) { // if over the bounds,
                        this.hovering = true;
                    } else {
                        this.hovering = false;
                    }
                }
            });
        }

        isActive() {
            return this.activeScreen === screen;
        }
    }

    //TODO CLASSES FOR EACH SCREEN
    class EditorScreen {

        constructor() {

        }
    }

    const keyPresses = {
        up: false,
        left: false,
        down: false,
        right: false,
        shift: false,
    }

    const mouse = {
        leftClickDown: false,
        rightClickDown: false,
        clickCount: 0,
        clickCreation: 0,
    }

    const server = io();
    const devMode = { ray: false, movementent: false, AABB: false, hitboxes: false };

    const cb = "#0daaf2"; //            border color
    const c0 = "#0dbdf2"; // "#00c5ff"; base water color
    const c1 = "#0dc8f2"; // "#00d2ff"; 
    const c2 = "#0dd4f2"; // "#00dfff";
    const c3 = "#0de3f2"; // "#00ecff";
    const is = "#ffe1ba"; //            island color

    const canvas = document.querySelector("#canvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const playerSprites = new SpriteManager();
    const inventorySprites = new SpriteManager();
    const tileSprites = new SpriteManager();
    playerSprites.loadImage("/sprites1.png", 3, 4, 200, 200, 256);
    inventorySprites.loadImage("/inventory1.png", 4, 4, 256, 256, 2);
    tileSprites.loadImage("/tiles1.png", 4, 4, 256, 256, 2);

    const mathHelper = new AngleHelper(65536);

    //screens: game, chat, menu, editor
    let screen = "menu";
    let chatInput = "";

    const velocity = new Vec(0, 0);
    const cameraCenter = new Vec(0, 0);
    const camera = new Vec(-canvas.width * 0.5, -canvas.height * 0.5);
    const mousePos = new Rectangle(0, 0, 0, 0);

    const framesPerSecond = 60
    const msPerFrame = 1000 / framesPerSecond;
    const useDelay = 800;
    let attackStart = 0;
    let attackQueued = false;
    let damageStart = 0;
    let healingStart = 0;

    const velocityFactor = 1;
    const playerRadius = 20;
    const boundingBoxFactor = 5; // box factor

    //THIS ENTITY
    const client = new GameObject(undefined, "player", undefined, undefined, { heldItem: Item.empty(), attackFrame: -1, damageFrame: -1, messageQueue: [], health: 100 });
    const clientAABB = new Rectangle(0, 0, playerRadius * 2 * boundingBoxFactor, playerRadius * 2 * boundingBoxFactor);
    const renderDist = new Rectangle(-canvas.width * 0.75, -canvas.height * 0.75, canvas.width * 1.5, canvas.height * 1.5);
    let isAlive = false;

    //to add items to hotbar we just need to do /push("item");
    let selectedSlot = 0;
    //const inventory = [Item.empty(), new Item(8, "sword"), new Item(9, "sword"), new Item(10, "sword"), new Item(11, "sword"), new Item(5, "pickaxe", 9999)];

    
    const editor = new EditorScreen();
    const mapSize = 15000;
    const mapSizeHalf = mapSize * 0.5;
    const numTiles = 150;
    const tileSize = mapSize / numTiles;
    const zoomOrigin = new Vec(0, 0);
    const editorMouseStart = new Vec(0, 0);
    let zoom = 1;
    let editorTool = Tile.water(0, 0, 0);
    let editorFill = false;
    const editorTiles = {}
    const editorBounds = new Rectangle(0, 0, 0, 0);

    const crafts = {
        wood_pickaxe: { name: "Wood Pickaxe", item: Item.wood_pickaxe(), recipe: [Item.wood(20)], button: new ClickableWidget(undefined, () => craft(crafts.wood_pickaxe), "game") },
        stone_pickaxe: { name: "Stone Pickaxe", item: Item.stone_pickaxe(), recipe: [Item.wood(40), Item.stone(30), Item.wood_pickaxe(1)], button: new ClickableWidget(undefined, () => craft(crafts.stone_pickaxe), "game") },
        iron_pickaxe: { name: "Iron Pickaxe", item: Item.iron_pickaxe(), recipe: [Item.stone(60), Item.iron(40), Item.stone_pickaxe(1)], button: new ClickableWidget(undefined, () => craft(crafts.iron_pickaxe), "game") },
        diamond_pickaxe: { name: "Diamond Pickaxe", item: Item.diamond_pickaxe(), recipe: [Item.iron(80), Item.diamond(50), Item.iron_pickaxe(1)], button: new ClickableWidget(undefined, () => craft(crafts.diamond_pickaxe), "game") },
        wood_sword: { name: "Wood Sword", item: Item.wood_sword(), recipe: [Item.wood(30)], button: new ClickableWidget(undefined, () => craft(crafts.wood_sword), "game") },
        stone_sword: { name: "Stone Sword", item: Item.stone_sword(), recipe: [Item.wood(60), Item.stone(40), Item.wood_sword(1)], button: new ClickableWidget(undefined, () => craft(crafts.stone_sword), "game") },
        iron_sword: { name: "Iron Sword", item: Item.iron_sword(), recipe: [Item.stone(80), Item.iron(50), Item.stone_sword(1)], button: new ClickableWidget(undefined, () => craft(crafts.iron_sword), "game") },
        diamond_sword: { name: "Diamond Sword", item: Item.diamond_sword(), recipe: [Item.iron(100), Item.diamond(60), Item.iron_sword(1)], button: new ClickableWidget(undefined, () => craft(crafts.diamond_sword), "game") },
    }
    const inventory = [Item.empty(), Item.empty(), Item.empty(), Item.empty(), Item.empty(), Item.empty(), Item.empty()];
    let availCrafts = [];

    const playButton = new ClickableWidget(new Rectangle(0, 0, 150, 50), () => {
        screen = "game";
        isAlive = true;
        client.position = new Vec(0, 0); //randomize?
        client.angle = 0;
        client.data.heldItem = inventory[0];
        client.data.attackFrame = -1;
        client.data.damageFrame = -1;
        client.data.messageQueue = [];
        client.data.health = 100;
        server.emit("join",);
    }, "menu");

    let serverEntities = [];
    const tilesAbove = [];
    const tilesBelow = [];

    //types of tiles:
    //rigidtile (wall, can't walk through)
    //belowtile (below the player)
    //abovetile (above the player)
    //watertile (water, can't breathe in it)
    let mapCreated = false;
    function createMap() {
        if (!mapCreated) {
            //console.log("CREATING MAP!");

            const wallWidth = 1000;

            tilesAbove.push(Tile.wall(-mapSizeHalf, -mapSizeHalf, wallWidth, mapSize, cb));
            tilesAbove.push(Tile.wall(-mapSizeHalf, -mapSizeHalf, mapSize, wallWidth, cb));
            tilesAbove.push(Tile.wall(-mapSizeHalf, mapSizeHalf - wallWidth, mapSize, wallWidth, cb));
            tilesAbove.push(Tile.wall(mapSizeHalf - wallWidth, -mapSizeHalf, wallWidth, mapSize, cb));

            for (const entry of Object.entries(editorTiles)) {
                let x = parseInt(entry[0].substring(1, entry[0].indexOf("y")));
                let y = parseInt(entry[0].substring(entry[0].indexOf("y") + 1));
                x *= tileSize;
                y *= tileSize;
                x -= mapSizeHalf;
                y -= mapSizeHalf;
                if (entry[1].shape.shape === "circle") {
                    x += tileSize * 0.5;
                    y += tileSize * 0.5;
                }
                let tile = Tile.empty();
                Object.assign(tile, entry[1]);
                tile = tile.startAt(x, y);
                if (entry[1].name === "rigidtile") {
                    tilesAbove.push(tile);
                } else {
                    tilesBelow.push(tile);
                }
            }
            mapCreated = true;
        }
    }

    // CLIENT GAME LOOP
    // IMPLEMENT VARIABLE TIME STEP
    function gameLoop() {
        updatePlayer();
        doCollisions();
        updateCamera();
        updateMouseAngle();
        fireMouseClicks();
        updateAttackStatus();
        if (screen !== "editor") {
            renderGame();
        }
        if (screen === "game" || screen === "chat") {
            renderPlayerHud();
        } else if (screen === "menu") {
            renderMenuHud();
        } else if (screen === "editor") {
            renderEditor();
        }
    }
    setInterval(gameLoop, msPerFrame);

    // PART OF LEVEL EDITOR!!!!!!!!!!!!
    function renderEditor() {
        clearCanvas();

        const sideLength = Math.max(0, Math.min(canvas.width, canvas.height) - 20);
        const left = (canvas.width - sideLength) * 0.5;
        const top = (canvas.height - sideLength) * 0.5;

        const scaledLeft = left * zoom + zoomOrigin.x;
        const scaledTop = top * zoom + zoomOrigin.y;
        const scaledSideLength = sideLength * zoom;

        editorBounds.x = scaledLeft;
        editorBounds.y = scaledTop;
        editorBounds.width = scaledSideLength;
        editorBounds.height = scaledSideLength;

        const centerX = scaledLeft + scaledSideLength * 0.5;
        const centerY = scaledTop + scaledSideLength * 0.5;
        drawRectangle(0, 0, canvas.width, canvas.height, c0);
        drawCircle(centerX, centerY, scaledSideLength * 0.4, is);
        drawCircle(centerX, centerY - 9 / 30 * scaledSideLength, 5 / 30 * scaledSideLength, c0);
        drawCircle(centerX, centerY - 9.5 / 30 * scaledSideLength, 3 / 30 * scaledSideLength, is);
        drawRectangle(centerX - 0.3 / 30 * scaledSideLength, centerY - 7 / 30 * scaledSideLength, 0.6 / 30 * scaledSideLength, 3.5 / 30 * scaledSideLength, is);
        for (const entry of Object.entries(editorTiles)) {
            const x = entry[0].substring(1, entry[0].indexOf("y"));
            const y = entry[0].substring(entry[0].indexOf("y") + 1);
            drawRectangle(scaledLeft + scaledSideLength / numTiles * x, scaledTop + scaledSideLength / numTiles * y, scaledSideLength / numTiles, scaledSideLength / numTiles, entry[1].color);
        }
        for (let x = 0; x <= numTiles; x++) {
            drawRectangle(scaledLeft + scaledSideLength / numTiles * x, scaledTop, 1, scaledSideLength);
        }
        for (let y = 0; y <= numTiles; y++) {
            drawRectangle(scaledLeft, scaledTop + scaledSideLength / numTiles * y, scaledSideLength, 1);
        }
    }

    function editorAddTile() {
        if (rectIntersect(mousePos, editorBounds)) {
            const sideLength = Math.min(canvas.width, canvas.height) - 20;
            const left = (canvas.width - sideLength) * 0.5;
            const top = (canvas.height - sideLength) * 0.5;

            const scaledLeft = left * zoom + zoomOrigin.x;
            const scaledTop = top * zoom + zoomOrigin.y;

            const xPos = Math.floor((mousePos.x - scaledLeft) / zoom / sideLength * numTiles);
            const yPos = Math.floor((mousePos.y - scaledTop) / zoom / sideLength * numTiles);


            console.log(editorTool.name);
            if (editorTool.name !== "empty") {
                if (editorFill) {
                    editorFillTiles(getTile(xPos, yPos), xPos, yPos, editorTool);
                } else {
                    setTile(xPos, yPos, editorTool.startAt(xPos, yPos));
                }
            } else {
                deleteTile(xPos, yPos);
            }
        }
    }

    function editorFillTiles(tyleTypeToFill, tileX, tileY, newTile) {
        // set the tile
        //console.log(newTile);
        //console.log(Tile.empty());
        if (newTile !== Tile.empty()) {
            setTile(tileX, tileY, newTile.startAt(tileX, tileY));
        } else {
            deleteTile(tileX, tileY);
        }
        //console.log("TO FILL:")
        //console.log(`CLICKED: (${tileX}, ${tileY})`)
        //console.log("TO FILL ALL:");
        //console.log(tyleTypeToFill);
        //console.log("ID: " + tyleTypeToFill.id);
        //console.log("TILE LEFT:");
        //const tf = tileX + 1 < editorSize && getTile(tileX + 1, tileY).id === tyleTypeToFill.id;
        if (tileX + 1 < numTiles && getTile(tileX + 1, tileY).id === tyleTypeToFill.id) {
            //console.log("RIGHT ONE ID: " + getTile(tileX + 1, tileY).id + " FILL ID: " + tyleTypeToFill.id);
            //console.log("FILLING (" + (tileX + 1) + ", " + tileY+ ")");
            //console.log(getTile(tileX + 1, tileY).id);

            editorFillTiles(tyleTypeToFill, tileX + 1, tileY, newTile);
        }
        if (tileY + 1 < numTiles && getTile(tileX, tileY + 1).id === tyleTypeToFill.id) {
            //console.log("FILLING (" + tileX + ", " + (tileY+1)+ ")");
            //console.log(getTile(tileX, tileY + 1).id);
            editorFillTiles(tyleTypeToFill, tileX, tileY + 1, newTile);
        }
        if (tileX - 1 >= 0 && getTile(tileX - 1, tileY).id === tyleTypeToFill.id) {
            //console.log("FILLING (" + (tileX - 1) + ", " + tileY+ ")");
            //console.log(getTile(tileX - 1, tileY).id);
            editorFillTiles(tyleTypeToFill, tileX - 1, tileY, newTile);
        }
        if (tileY - 1 >= 0 && getTile(tileX, tileY - 1).id === tyleTypeToFill.id) {
            //console.log("FILLING (" + tileX + ", " + (tileY - 1)+ ")");
            //console.log(getTile(tileX, tileY - 1).id);
            editorFillTiles(tyleTypeToFill, tileX, tileY - 1, newTile);
        }
    }

    function getTile(row, col) {
        const tile = editorTiles[`x${row}y${col}`];
        if (tile === undefined) {
            return Tile.empty();
        }
        return tile;
    }

    function setTile(row, col, tile) {
        editorTiles[`x${row}y${col}`] = tile;
    }

    function deleteTile(row, col) {
        delete editorTiles[`x${row}y${col}`];
    }
    // PART OF LEVEL EDITOR!!!!!!!!!

    function renderMenuHud() {
        const centerX = 0.5 * canvas.width;
        const centerY = 0.5 * canvas.height;

        playButton.bounds.x = centerX - 100;
        playButton.bounds.y = centerY - 50;
        playButton.bounds.width = 200;
        playButton.bounds.height = 100;

        drawRectangle(0, 0, canvas.width, canvas.height, "rgba(255,255,255,0.5)");
        drawButton(playButton, "#57E86B", "#A9F36A", "#FEFE69");

        ctx.fillStyle = "black";
        ctx.fillText("PLAY", centerX - 40, centerY + 12);
        ctx.font = "bold 32px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText("PLAY", centerX - 42, centerY + 10);

    }

    function renderGame() {
        clearCanvas();

        //WILL BE DRAWN RELATIVE TO 0,0 USING THE CONTEXT OF THE CAMERA
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        renderMap();
        drawWater();
        for (const tile of tilesBelow) {
            if (rectIntersect(tile.AABB, renderDist)) {
                if (tile.name !== "watertile") {
                    tile.draw();

                }
            }
        }
        //renders provided by the server
        for (const entity of serverEntities) {
            if (entity.id !== client.id) {
                if (entity.name = "player") {
                    drawPlayer(entity);
                } else if (entity.name = "arrow") {

                }
            }
        }
        if (isAlive) {
            drawPlayer(client);
        }
        for (const tile of tilesAbove) {
            if (rectIntersect(tile.AABB, renderDist)) {
                tile.draw();
            }
        }

        ctx.restore();
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function renderMap() {
        drawRectangle(-mapSizeHalf, -mapSizeHalf, mapSize, mapSize, c0); //background
        const mainIslandRadius = mapSizeHalf * 0.8;
        const cutoutOffsetY = mapSizeHalf * 0.6;
        const cutoutRadius = mapSizeHalf * 0.333;
        const bridgeLength = mapSizeHalf * 0.233;
        const smallIslandOffsetY = mapSizeHalf * 0.633;
        const smallIslandRadius = mapSizeHalf * 0.2;

        drawCircle(0, 0, mainIslandRadius + 400, c1); //main island 1
        drawCircle(0, 0, mainIslandRadius + 200, c2); //main island 2
        drawCircle(0, 0, mainIslandRadius + 100, c3); //main island 3
        drawCircle(0, 0, mainIslandRadius, is); //main island MAIN

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, mainIslandRadius + 100, 0, Math.PI * 2);
        ctx.clip();
        drawCircle(0, -cutoutOffsetY, cutoutRadius + 200, c3); //cutout main island 3
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, mainIslandRadius + 200, 0, Math.PI * 2);
        ctx.clip();
        drawCircle(0, -cutoutOffsetY, cutoutRadius + 100, c2); //cutout main island 2
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, mainIslandRadius + 400, 0, Math.PI * 2);
        ctx.clip();
        drawCircle(0, -cutoutOffsetY, cutoutRadius, c1); //cutout main island 1
        ctx.restore();
        drawCircle(0, -cutoutOffsetY, cutoutRadius - 200, c0); //cutout main island 0

        ctx.save();
        ctx.beginPath()
        ctx.arc(0, -cutoutOffsetY, cutoutRadius - 100, 0, Math.PI * 2);
        ctx.clip();
        drawRectangle(-700, -bridgeLength * 2, 1400, bridgeLength, c1); //bridge 1
        ctx.restore();
        drawCircle(0, -smallIslandOffsetY, smallIslandRadius + 400, c1); //small island 1


        ctx.save();
        ctx.beginPath()
        ctx.arc(0, -cutoutOffsetY, cutoutRadius + 100, 0, Math.PI * 2);
        ctx.clip();
        drawRectangle(-500, -bridgeLength * 2, 1000, bridgeLength, c2); //bridge 2
        ctx.restore();
        drawCircle(0, -smallIslandOffsetY, smallIslandRadius + 200, c2); //small island 2

        ctx.save()
        ctx.beginPath();
        ctx.arc(0, -cutoutOffsetY, cutoutRadius + 200, 0, Math.PI * 2);
        ctx.clip();
        drawRectangle(-400, -bridgeLength * 2, 800, bridgeLength, c3); //bridge 3
        ctx.restore();
        drawCircle(0, -smallIslandOffsetY, smallIslandRadius + 100, c3); //small island 3

        drawRectangle(-300, -bridgeLength * 2, 600, bridgeLength, is); //bridge MAIN
        drawCircle(0, -smallIslandOffsetY, smallIslandRadius, is); //small island MAIN

        //ctx.globalCompositeOperation = "saturation";
        //for (let x = -15050; x < 15000; x += 100) {
        //    drawRectangle(x, -15000, 5, 30000, gr);
        //}
        //for (let y = -15000; y < 15000; y += 100) {
        //    drawRectangle(-15000, y, 30000, 5, gr);
        //}
        //ctx.globalCompositeOperation = "source-over";
    }

    function drawWater() {
        for (let radius = 48; radius >= 24; radius -= 12) {
            //console.log("DRAW RADIUS: " + radius);
            let color = c3;
            if (radius === 36) {
                color = c1;
            }
            if (radius === 24) {
                color = c0;
            }
            for (const tile of tilesBelow) {
                //console.log(tile.name);
                if (tile.name === "watertile" && rectIntersect(tile.AABB, renderDist)) {
                    drawRoundedRectangle(tile.position.x, tile.position.y, 100, 100, radius, color);
                }
            }
        }
    }

    //ADD LAYERING
    function renderPlayerHud() {
        const centerX = canvas.width * 0.5;

        // inventory
        for (let i = 0; i < inventory.length; i++) {
            let color = "rgba(0,0,0,0.25)";
            if (i === selectedSlot) color = "rgba(0,0,0,0.5)";
            const slotLeft = centerX - inventory.length * 50 + i * 100;
            const slotTop = canvas.height - 110;

            drawRectangle(slotLeft, slotTop, 100, 100, color);
            if (inventory[i] !== null) {
                drawSprite(inventorySprites.get(inventory[i].id).startAt(slotLeft + 50, slotTop + 50), ctx, inventorySprites.spriteSheet);
                const count = inventory[i].count;
                if (count > 1) {
                    ctx.font = "bold 32px sans-serif";
                    ctx.fillStyle = "rgb(255,255,255)";

                    const textWidth = ctx.measureText(count).width;
                    ctx.fillText(count, slotLeft + 95 - textWidth, slotTop + 95, 100);
                }
            }
        }

        for (let i = 0; i < availCrafts.length; i++) {
            const top = 20 + i * 16;
            const left = 20;
            ctx.font = "bold 16px sans-serif";
            ctx.fillStyle = "rgb(0,255,0)";

            const textWidth = ctx.measureText(availCrafts[i]).width;
            ctx.fillText(availCrafts[i].name, left, top + 16);
            availCrafts[i].button.bounds = new Rectangle(left, top, textWidth, 16);
        }
        // health bar
        // drawRectangle(centerX - 105, canvas.height - 145, 210, 30, "rgba(0,0,0,0.25)");
        // drawRectangle(centerX - 100, canvas.height - 140, client.data.health * 2, 20, "red");

    }

    function drawPlayer(entity) {
        if (entity.id !== undefined) {
            let color = "rgb(0,255,0)";
            //if (entity.id === client.id) {
            //    color = "rgb(0,255,0)";
            //} else {
            //    color = "rgb(255,0,0)";
            //}

            //DRAWN RELATIVE TO THE PLAYERS POSITION
            ctx.save();
            ctx.translate(entity.position.x, entity.position.y);

            //CHAT BUBBLE
            drawChatBubble(entity.data.messageQueue, color);

            //HEALTH BAR
            drawHealthBar(entity.data.health);

            //IF PLAYER IS DAMAGED
            const bodyCanvas = document.createElement("canvas");
            const bctx = bodyCanvas.getContext("2d");
            const halfLength = 128;
            bodyCanvas.width = halfLength * 2;
            bodyCanvas.height = halfLength * 2
            bctx.translate(halfLength, halfLength); // CENTER OF OUR CANVAS IS 100, 100 NOW

            //DRAW PLAYER BODY
            //renderer.drawSprite(spriteManager.get(0));
            //renderer.drawSprite(spriteManager.get(2));
            drawSprite(playerSprites.get(0).startAt(), bctx, playerSprites.spriteSheet);
            drawSprite(playerSprites.get(2).startAt(), bctx, playerSprites.spriteSheet);

            //DRAW WEAPON
            let item = entity.data.heldItem;
            const animation = animate(item.type, entity.data.attackFrame);
            const r = animation.r; // right hand vec
            const l = animation.l; // left hand vec
            const w = animation.w; // weapon vec
            const a = animation.a; // angle
            if (item.type === "pickaxe") {
                //renderer.drawSprite(spriteManager.get(item.id).startAt(w.x, w.y).rotate(entity.angle + a));
                drawSprite(playerSprites.get(item.spriteId).startAt(w.x, w.y).rotate(entity.angle + a), bctx, playerSprites.spriteSheet);

            } else if (item.type === "sword") {
                //renderer.drawSprite(spriteManager.get(item.id).startAt(w.x, w.y, Math.PI * 0.5).rotate(entity.angle + a));
                drawSprite(playerSprites.get(item.spriteId).startAt(w.x, w.y, Math.PI * 0.5).rotate(entity.angle + a), bctx, playerSprites.spriteSheet);
            }

            //DRAW HANDS
            //renderer.drawSprite(spriteManager.get(1).startAt(r.x, r.y).rotate(entity.angle + a));
            //renderer.drawSprite(spriteManager.get(3).startAt(r.x, r.y).rotate(entity.angle + a));
            //renderer.drawSprite(spriteManager.get(1).startAt(l.x, l.y).rotate(entity.angle + a));
            //renderer.drawSprite(spriteManager.get(3).startAt(l.x, l.y).rotate(entity.angle + a));
            drawSprite(playerSprites.get(1).startAt(r.x, r.y).rotate(entity.angle + a), bctx, playerSprites.spriteSheet);
            drawSprite(playerSprites.get(3).startAt(r.x, r.y).rotate(entity.angle + a), bctx, playerSprites.spriteSheet);
            drawSprite(playerSprites.get(1).startAt(l.x, l.y).rotate(entity.angle + a), bctx, playerSprites.spriteSheet);
            drawSprite(playerSprites.get(3).startAt(l.x, l.y).rotate(entity.angle + a), bctx, playerSprites.spriteSheet);

            const df = entity.data.damageFrame;

            if (df >= 0 && df <= useDelay) {
                bctx.globalCompositeOperation = "source-atop";
                const halfDelay = useDelay * 0.5
                const alpha = (-Math.abs(df - halfDelay) + halfDelay) / halfDelay;
                bctx.fillStyle = `rgba(255,0,0,${alpha})`
                bctx.fillRect(-halfLength, -halfLength, bodyCanvas.width, bodyCanvas.height);
            }

            ctx.drawImage(bodyCanvas, -halfLength, -halfLength);

            ctx.globalCompositeOperation = "source-over";

            //HITBOX
            if (devMode.AABB) {
                drawRectangle(clientAABB.width * -0.5, clientAABB.height * -0.5, clientAABB.width, clientAABB.height, "red", 2);
            }
            ctx.restore();
        }
    }

    function drawTile(tile) {
        let centerX = tile.position.x;
        let centerY = tile.position.y;
        if (tile.data.shape === "rectangle") {
            centerX += tile.data.width * 0.5;
            centerY += tile.data.health * 0.5;
        }
        drawSprite(tileSprites.get(tile.id).startAt(centerX, centerY), ctx, tileSprites.spriteSheet);

        if (tile.id === -1) {
            if (tile.data.shape === "circle") {
                drawCircle(tile.position.x, tile.position.y, tile.data.radius, tile.data.color);
            } else if (tile.data.shape === "rectangle") {
                drawRectangle(tile.position.x, tile.position.y, tile.data.width, tile.data.height, tile.data.color);
            }
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

    function drawArc(x, y, radius, startAngle, endAngle, counterclockwise, color, lineWidth = -1) {
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
        if (lineWidth > 0) {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;
            ctx.stroke();
        } else {
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    function drawRectangle(x, y, width, height, color = "black", lineWidth = -1) {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.rect(x, y, width, height);
        if (lineWidth < 0) {
            ctx.fill();
        } else {
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    function drawRoundedRectangle(x, y, width, height, radius, color = "black") {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, radius, Math.PI, Math.PI * 1.5);
        ctx.lineTo(x + width, y - radius);
        ctx.arc(x + width, y, radius, Math.PI * 1.5, 0);
        ctx.lineTo(x + width + radius, y + height);
        ctx.arc(x + width, y + height, radius, 0, Math.PI * 0.5);
        ctx.lineTo(x, y + height + radius);
        ctx.arc(x, y + height, radius, Math.PI * 0.5, Math.PI);
        ctx.lineTo(x - radius, y);
        ctx.fill();
    }

    //we'll have to make a function similar to breakrenderedchatmessages...
    function drawChatBubble(messages, color) {
        ctx.font = 'bold 16px sans-serif';
        for (let i = messages.length - 1; i >= 0; i--) {

            const fadeTime = 3000;

            const timeLeft = fadeTime + messages[i].time - Date.now();
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

    function drawHealthBar(health) {
        if (health < 100) {
            const y = 35;

            const left = -25;
            const width = 50;

            const outerRadius = 3;
            const innerRadius = 2;

            const innerLeft = left - 2;
            const healthWidth = health * 0.55;

            ctx.beginPath();
            ctx.arc(left, y, outerRadius, Math.PI * 0.5, Math.PI * 1.5);
            ctx.lineTo(left + width, y - outerRadius);
            ctx.arc(left + width, y, outerRadius, Math.PI * 1.5, Math.PI * 0.5);
            ctx.lineTo(left, y + outerRadius);
            ctx.fillStyle = "rgb(0,0,0)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(innerLeft, y, innerRadius, Math.PI * 0.5, Math.PI * 1.5);
            ctx.lineTo(innerLeft + healthWidth, y - innerRadius);
            ctx.arc(innerLeft + healthWidth, y, innerRadius, Math.PI * 1.5, Math.PI * 0.5);
            ctx.lineTo(innerLeft, y + innerRadius);
            ctx.fillStyle = "rgb(0,255,0)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(left, y, outerRadius, Math.PI * 0.5, Math.PI * 1.5);
            ctx.lineTo(left + width, y - outerRadius);
            ctx.arc(left + width, y, outerRadius, Math.PI * 1.5, Math.PI * 0.5);
            ctx.lineTo(left, y + outerRadius);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgb(0,0,0)";
            ctx.stroke();
        }
    }

    function drawButton(button, baseColor, hoverColor, clickColor) {
        let color = "black";
        if (button.clicking && button.hovering) {
            color = clickColor;
        } else if (button.hovering) {
            color = hoverColor;
        } else {
            color = baseColor;
        }
        drawRectangle(button.bounds.x, button.bounds.y, button.bounds.width, button.bounds.height, color);
    }

    // CLIENT HAX --------------------- 
    function updatePlayer() {
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
            clientAABB.x = client.position.x - playerRadius * boundingBoxFactor;
            clientAABB.y = client.position.y - playerRadius * boundingBoxFactor;
            renderDist.x = client.position.x - canvas.width * 0.75;
            renderDist.y = client.position.y - canvas.height * 0.75;
            renderDist.width = canvas.width * 1.5;
            renderDist.height = canvas.height * 1.5;

            //drag
            velocity.x *= 0.75;
            velocity.y *= 0.75;

            if (Math.abs(velocity.x) < 0.5) velocity.x = 0;
            if (Math.abs(velocity.y) < 0.5) velocity.y = 0;

            if (velocity.componentSize() == 0) {
                if (healingStart < 60) {
                    healingStart++;
                } else {
                    healingStart = 0;
                    if (client.data.health < 100) {
                        client.data.health++;
                    }
                }
            } else {
                healingStart = 0;
            }
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
        client.angle = Math.atan2(- mousePos.y + client.position.y - camera.y, mousePos.x - client.position.x + camera.x);
    }

    function doCollisions() {
        for (const tile of tilesAbove) {
            if (tile.name === "rigidtile") {
                if (rectIntersect(tile.AABB, clientAABB)) {
                    resolveCollision(tile);
                }
            }
        }
    }

    function rectIntersect(rect1, rect2) {
        //console.log(rect1);
        //console.log(rect2);
        if (rect1.x + rect1.width > rect2.x &&
            rect2.x + rect2.width > rect1.x &&
            rect1.y + rect1.height > rect2.y &&
            rect2.y + rect2.height > rect1.y
        ) {
            if (devMode.AABB) {
                //console.log("AABB");
            }
            return true;
        }
        return false;
    }

    function circleIntersect(circle1, circle2) {
        const distanceBetween = new Vec(circle1.x - circle2.x, circle1.y - circle2.y);
        const sumRadius = circle1.radius + circle2.radius;
        return distanceBetween.lengthSquared() < sumRadius * sumRadius;
    }

    function rectCircleIntersect(rect, circle) {
        const nearestPoint = new Vec(Math.max(rect.x, Math.min(rect.x + rect.width, circle.x)), Math.max(rect.y, Math.min(rect.y + rect.height, circle.y)));
        const distanceToCircle = new Vec(nearestPoint.x - circle.x, nearestPoint.y - circle.y);
        return distanceToCircle.lengthSquared() < circle.radius * circle.radius;
    }

    function resolveCollision(tile) {
        const clientX = client.position.x;
        const clientY = client.position.y;
        const tileX = tile.position.x;
        const tileY = tile.position.y;

        if (tile.shape.shape === "circle") {
            const distanceBetween = new Vec(clientX - tileX, clientY - tileY);
            const sumRadius = playerRadius + tile.shape.radius;

            if (distanceBetween.lengthSquared() <= sumRadius * sumRadius) { //collision detected
                const hypo = distanceBetween.length();
                client.position.x = tileX + distanceBetween.x / hypo * (sumRadius + 1);
                client.position.y = tileY + distanceBetween.y / hypo * (sumRadius + 1);
            }
        } else if (tile.shape.shape === "rectangle") {
            const width = tile.shape.width;
            const height = tile.shape.height;
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

    function nextSlot() {
        setSlot(selectedSlot + 1);
    }

    function setSlot(index) { // Clears all animations sets mouseDown to false, if there is a buffer click we still fire attack 
        client.data.animation = -1;
        mouse.leftClickDown = false;

        if (index >= 0 && index < inventory.length) {
            selectedSlot = index
        } else {
            selectedSlot = 0;
        }
        client.data.heldItem = inventory[selectedSlot];
        return inventory[selectedSlot];
    }

    function fireMouseClicks() { //called every client tick
        if (isAlive && (mouse.leftClickDown || mouse.clickCount == 1)) { // click count of 1 signifies a buffer click meaning we fire our click event regardless of mouse being down.
            const time = Date.now();
            if (mouse.clickCreation + useDelay < time) { // fires an input
                mouse.clickCreation = time;
                mouse.clickCount = 0; //if we DONT fire an input this value will be 1 and will fire even with mouse down
                attackStart = Date.now();
                attackQueued = true;
                client.data.attackFrame = 0;
            }
        }
    }

    function updateAttackStatus() {
        client.data.attackFrame = Date.now() - attackStart;
        client.data.damageFrame = Date.now() - damageStart;
        if (attackQueued && Date.now() - attackStart > useDelay * 0.5) {
            interact(); // does interactions
            attackQueued = false;
        }
    }

    function animate(name, attackFrame) {
        if (name === "item") {
            const r = new Vec(15, 15);
            const l = new Vec(15, -15);
            if (attackFrame >= 0 && attackFrame <= useDelay) {
                const x = attackFrame;
                const fourthDelay = useDelay * 0.25;
                const dr = Math.max(-Math.abs(x - fourthDelay) + fourthDelay, 0) * 0.05;
                const dl = Math.max(-Math.abs(x - fourthDelay * 3) + fourthDelay, 0) * 0.05;
                r.x += dr;
                l.x += dl;
            }
            return {
                r: r,
                l: l,
                a: 0,
            }
        } else if (name === "pickaxe") { // actions should have a half useDelay difference
            const r = new Vec(15, 15);
            const l = new Vec(15, -15);
            const w = new Vec(20, -30);
            let a = 0;
            if (attackFrame >= 0 && attackFrame <= useDelay) {
                const x = attackFrame;
                if (x <= useDelay * 0.25) {
                    a = -4 / useDelay * x; // first quarter
                } else if (x <= useDelay * 0.5) {
                    a = 8 / useDelay * (x - useDelay * 0.25) - 1; // second quarter
                } else {
                    a = -2 / useDelay * (x - useDelay * 0.5) + 1; // second half
                }
            }
            return {
                r: r,
                l: l,
                w: w,
                a: a,
            }
        } else if (name === "sword") {
            const r = new Vec(15, 15);
            const l = new Vec(15, -15);
            const w = new Vec(3, 15);
            let a = 0;
            if (attackFrame >= 0 && attackFrame <= useDelay) {
                const x = attackFrame;
                if (x <= useDelay * 0.25) {
                    w.x = 3 + -10 / useDelay * x; // first quarter
                    r.x = w.x + 12;
                    a = -2 / useDelay * x;
                } else if (x <= useDelay * 0.5) {
                    w.x = 3 + 40 / useDelay * (x - useDelay * 0.25) - 2.5; // second quarter
                    r.x = w.x + 12;
                    a = 4 / useDelay * (x - useDelay * 0.25) - 0.5;
                } else {
                    w.x = 3 + -15 / useDelay * (x - useDelay * 0.5) + 7.5; // second half
                    r.x = w.x + 12;
                    a = -1 / useDelay * (x - useDelay * 0.5) + 0.5;
                }
            }
            return {
                r: r,
                l: l,
                w: w,
                a: a,
            }
        }
    }

    function interact() {
        const interactionPacket = {
            type: "damage",
            value: client.data.heldItem.damage,
        }
        const attackCircle = new Circle(client.position.x, client.position.y, playerRadius);
        if (client.data.heldItem.type === "sword" || client.data.heldItem.type === "pickaxe") {
            attackCircle.radius = playerRadius * 2;
            attackCircle.x += mathHelper.cos(client.angle) * playerRadius * 3;
            attackCircle.y -= mathHelper.sin(client.angle) * playerRadius * 3;
        } else {
            attackCircle.x += mathHelper.cos(client.angle) * playerRadius;
            attackCircle.y -= mathHelper.sin(client.angle) * playerRadius;
        }
        for (const entity of serverEntities) {
            if (entity.id !== client.id && circleIntersect(attackCircle, new Circle(entity.position.x, entity.position.y, playerRadius))) {
                //console.log("Interaction with " + entity.id);
                server.emit("interact", { receiver: entity.id, data: interactionPacket });
            }
        }
        for (const tile of tilesAbove) {
            if (rectIntersect(tile.AABB, clientAABB)) {

                if (tile.shape.shape === "circle") {
                    if (circleIntersect(attackCircle, new Circle(tile.position.x, tile.position.y, tile.shape.radius))) {
                        mineResource(tile, client.data.heldItem.gather);
                    }
                } else if (tile.shape.shape === "rectangle") {
                    if (rectCircleIntersect(tile.AABB, attackCircle)) {
                        mineResource(tile, client.data.heldItem.gather);
                    }
                }
            }
        }
        //check collision between player interaction hitbox and all entities which can be interacted with?
    }

    function mineResource(tile, gatherValue) {
        const countItems = gatherValue - tile.drop.gather;
        if (countItems > 0) {
            let x = tile.position.x;
            let y = tile.position.y;
            if (tile.shape.shape === "circle") {
                x -= tileSize * 0.5;
                y -= tileSize * 0.5;
            }
            x += mapSizeHalf;
            y += mapSizeHalf;
            x /= tileSize;
            y /= tileSize;
            server.emit("mine", { tile: `x${x}y${y}`, count: countItems});
            //addToInventory(tile.drop.item, countItems);
        }
    }

    //TODO MAKE LIST OF ITEMS? MAKE registry of all things in the game instead of id system
    function addToInventory(item, count) {
        let hasAdded = false;
        for (const slot of inventory) {
            // try to add it to the first stack.
            if (!hasAdded && slot.id === item.id && slot.type != "sword" && slot.type != "pickaxe") {
                slot.count += count;
                hasAdded = true;
            }
        }
        if (!hasAdded) {
            for (const emptySlot of inventory) {
                if (!hasAdded && emptySlot.id === -1) {
                    Object.assign(emptySlot, item);
                    emptySlot.count = count;
                    hasAdded = true;
                }
            }
        }
        updateCrafts();
        //console.log(inventory);
        return hasAdded;
    }

    function updateCrafts() {
        availCrafts = [];
        for (const craft of Object.values(crafts)) {
            Object.assign(craft.button.bounds, new Rectangle(0, 0, 0, 0));
            let isValidCraft = true;
            for (const item of craft.recipe) {
                let itemInInventory = false;
                for (const slot of inventory) {
                    if (slot.id === item.id && slot.count >= item.count) {
                        itemInInventory = true;
                    }
                }
                if (!itemInInventory) {
                    isValidCraft = false;
                }
            }
            if (isValidCraft) {
                availCrafts.push(craft);
            }
        }
    }

    function craft(craft) {
        // guaranteed to have all ingredients.
        const newInv = JSON.parse(JSON.stringify(inventory));
        for (const ingredient of craft.recipe) {
            const invItem = getFromInvById(newInv, ingredient.id);
            invItem.count -= ingredient.count;
            if (invItem.count === 0) {
                Object.assign(invItem, Item.empty());
            }
        }
        // if we have an empty slot.
        if (getFromInvById(newInv, Item.empty().id) != null) {
            Object.assign(inventory, newInv);
            addToInventory(craft.item, 1);
            setSlot(selectedSlot);
        } else {
            // some feedback message letting player know that their inventory is full
        }
    }

    function getFromInvById(targetInventory, targetId) {
        for (const item of targetInventory) {
            if (targetId === item.id) {
                return item;
            }
        }
        return null;
    }

    function handleDamage(damageValue) {
        client.data.health -= damageValue;
        damageStart = Date.now();
        if (client.data.health <= 0) {
            screen = "menu";
            server.emit("exit",);
            isAlive = false;
        }
    }

    function error(message) {
        throw new Error(message);
    }

    window.addEventListener("keydown", (key) => {
        if (screen === "chat") {
            switch (key.key) {
                case "Enter": {
                    //TODO, MAKE GETPLAYER HANDLE THIS maybe making the server do this makes more sense tho
                    const messagePackage = { message: chatInput, time: Date.now() };
                    client.data.messageQueue.push(messagePackage);
                    chatInput = "";
                    screen = "game";
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
                    screen = "game";
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
        } else if (screen === "game") {
            switch (key.key.toLowerCase()) {
                case "w": keyPresses.up = true;
                    break;
                case "a": keyPresses.left = true;
                    break;
                case "s": keyPresses.down = true;
                    break;
                case "d": keyPresses.right = true;
                    break;
                case "t": screen = "chat";
                    break;
                case "q": {
                    nextSlot();
                }
                    break;
            }
        } else if (screen === "editor") {
            switch (key.key) {
                case "1": {
                    let id = editorTool.id;
                    if (id >= 0 && id < 3) {
                        id++;
                    } else {
                        id = 0;
                    }
                    editorTool = Tile.wood(0, 0, id);
                }
                    break;
                case "2": {
                    let id = editorTool.id;
                    if (id >= 4 && id < 7) {
                        id++;
                    } else {
                        id = 4;
                    }
                    editorTool = Tile.stone(0, 0, id);
                }
                    break;
                case "3": {
                    let id = editorTool.id;
                    if (id >= 8 && id < 11) {
                        id++;
                    } else {
                        id = 8;
                    }
                    editorTool = Tile.iron(0, 0, id);
                }
                    break;
                case "4": {
                    let id = editorTool.id;
                    if (id >= 12 && id < 15) {
                        id++;
                    } else {
                        id = 12;
                    }
                    editorTool = Tile.diamond(0, 0, id);
                }
                    break;
                case "5": {
                    editorTool = Tile.water(0, 0, 0);
                }
                    break;
                case "d": {
                    editorTool = Tile.empty();
                }
                    break;
                case "s": {
                    console.log("SAVING MAP...");
                    server.emit("savemap", editorTiles);
                }
                    break;
                case "l": {
                    console.log("LOADING MAP...");
                    server.emit("loadmap",);
                }
                    break;
                case "g": {
                    editorFill = !editorFill;
                }
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

    window.addEventListener("load", (event) => {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
    });

    window.addEventListener("resize", (event) => {
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
    });

    window.addEventListener("mousemove", (event) => {
        mousePos.x = event.clientX;
        mousePos.y = event.clientY;
        if (screen === "editor") {
            if (mouse.leftClickDown) {
                editorAddTile();
            }

            if (mouse.rightClickDown) {
                zoomOrigin.x += mousePos.x - editorMouseStart.x;
                zoomOrigin.y += mousePos.y - editorMouseStart.y;
                editorMouseStart.x = mousePos.x;
                editorMouseStart.y = mousePos.y;
            }
        }
    });

    window.addEventListener("mousedown", (event) => {
        if (event.button !== 2) {
            mouse.leftClickDown = true;
            mouse.clickCount++;
        } else {
            mouse.rightClickDown = true;
        }
        if (screen === "editor") {
            if (mouse.leftClickDown) {
                editorAddTile();
            }

            if (mouse.rightClickDown) {
                editorMouseStart.x = event.x;
                editorMouseStart.y = event.y;
            }
        }
    });

    window.addEventListener("mouseup", (event) => {
        mouse.leftClickDown = false;
        mouse.rightClickDown = false;
    });

    window.addEventListener("wheel", (event) => {
        const mouseX = event.clientX - zoomOrigin.x;
        const mouseY = event.clientY - zoomOrigin.y;

        const lastZoom = zoom;

        zoom += event.deltaY * 0.01;
        zoom = Math.max(1, zoom);

        const newX = mouseX * (zoom / lastZoom);
        const newY = mouseY * (zoom / lastZoom);

        zoomOrigin.x += mouseX - newX;
        zoomOrigin.y += mouseY - newY;

        //console.log(`(${zoomOrigin.x}, ${zoomOrigin.y})`);
    });

    window.addEventListener('contextmenu', event => {
        event.preventDefault();
    });

    server.on("init", (init) => {
        client.id = init.id;
        Object.assign(editorTiles, init.map);
        console.log(`Joined with ID: \x1b[33m${client.id}\x1b[0m`);
        server.emit("init", client);
        if (isAlive) {
            server.emit("join",);
        }
        createMap();
    });

    server.on("getclientdata", () => {
        server.emit("getclientdata", client);
    });

    server.on("sendserverdata", (entities) => {
        serverEntities = entities;
    });

    server.on("mine", packet => {
        addToInventory(packet.item, packet.count);
    });

    server.on("interact", packet => {
        if (packet.type === "damage") {
            handleDamage(packet.value);
        }
    });

    server.on("loadmap", (map) => {
        Object.assign(editorTiles, map);
        //createMap();
    });
})();