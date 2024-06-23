const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("canvas"));
const ctx = canvas.getContext("2d");
const pauseBtn = document.getElementById("pauseBtn");
const materialsConatiner = document.getElementById("materialsContainer");
const metalBoxBtn = document.getElementById("metalBox");
const cannonBtn = document.getElementById("cannon");
const trapBtn = document.getElementById("trap");
const restartBtn = document.getElementById("restartBtn");
const gameOverWindow = document.getElementById("gameOverContainer");
const scoreDisplay = document.getElementById("score");
const darkDiv = document.getElementById("darkDiv");
const leaderBoardBtn = document.getElementById("leaderBoardBtn");
const leaderBoardWindow = document.getElementById("leaderBoardContainer");
const leaderBoardDisplay = document.querySelector("#leaderBoardContainer pre");
const playBtn = document.getElementById("playBtn");
const countDown = document.getElementById("countDown");
const startBtn = document.getElementById("startBtn");
const backgroundMusic = document.createElement("audio");

const MAX_VELOCITY = 100, MAX_PREP_TIME = 60, MAX_FUEL = 1, THRESHOLD = 0.1, MOB_CAP_COUNT = 10, POPUP_TIME = 3000;
const gravity = 0.7, playerJumpVelocity = 1.3, playerHorizotalAcceleration = 15, zombieSpeed = 7, friction = 0.7, airDrag = 0.6, bulletVelocity = 20;
const perfectFrameTime = 1000 / 60, zombieDamage = 0.1, bulletDamage = 50, zombieJumpVelocity = -10, powerUpTime = 5000;
let shootCoolDown = 500;
let UP = false, LEFT = false, RIGHT = false, canShoot = true, isPaused = false, shouldPanHorizontal = false,isGameOver = false, materialBuffer = null, materialBufferImg = null;
let rigidBodies = [], zombieCount = 0, platforms = [], traps = [], leaderBoard = [];
let frameCount = 0, secondsPassed = 0, deltaTime = 0, lastTimeStamp = 0, playerScore = 0, currentTime = 0, rotateAngle = 0;
let zombieState = "runLeft", playerState = "runRight", phase = "prep";
let jetpackFuel = MAX_FUEL, mouseX, mouseY, prepTimeoutId, zombieSpawnTimeoutId, player, platform;

const metalBoxImg = new Image();
const platformImg = new Image();
const cannonImg = new Image();
const trapImg = new Image();
const healthPowerOrbImg = new Image();
const ammoPowerOrbImg = new Image();
const fuelIcon = new Image();

metalBoxImg.src = "./media/metal_box.png";
platformImg.src = "./media/platform1.png";
cannonImg.src = "./media/cannon.png";
trapImg.src = "./media/trap_img.png";
healthPowerOrbImg.src= "./media/health_power.png";
ammoPowerOrbImg.src = "./media/ammo_power.png";
fuelIcon.src = "./media/fuel_icon.png";
backgroundMusic.src = "./media/background_music.mp3";

backgroundMusic.loop = true;
backgroundMusic.volume = 0.2;


/* --------------------------------------------------------- For Readability------------------------------------------------------------

**Different types of phases**

1. prep - Preperation phase starts
2. pending - Until the Preperation ends
3. battle - Battle starts
4. war - Until the end of game

*/

//sprites for all zombies
const zombieAnimation = {
    normalZombie:{
        idleLeft: {
            src: "./media/zombie_idle_left.png",
            frames: 15,
            frameBuffer: 3
        },
        idleRight: {
            src: "./media/zombie_idle_right.png",
            frames: 15,
            frameBuffer: 3
        },
        runRight: {
            src: "./media/zombie_run_right.png",
            frames: 10,
            frameBuffer: 10
        },
        runLeft: {
            src: "./media/zombie_run_left.png",
            frames: 10,
            frameBuffer: 10
        },
        attackLeft: {
            src: "./media/zombie_attack_left.png",
            frames: 8,
            frameBuffer: 15
        },
        attackRight: {
            src: "./media/zombie_attack_right.png",
            frames: 8,
            frameBuffer: 15
        }
    },
    climberZombie:{
        idleLeft: {
            src: "./media/climber_zombie_idle_left.png",
            frames: 15,
            frameBuffer: 3
        },
        idleRight: {
            src: "./media/climber_zombie_idle_right.png",
            frames: 15,
            frameBuffer: 3
        },
        runRight: {
            src: "./media/climber_zombie_run_right.png",
            frames: 10,
            frameBuffer: 10
        },
        runLeft: {
            src: "./media/climber_zombie_run_left.png",
            frames: 10,
            frameBuffer: 10
        },
        attackLeft: {
            src: "./media/climber_zombie_attack_left.png",
            frames: 8,
            frameBuffer: 15
        },
        attackRight: {
            src: "./media/climber_zombie_attack_right.png",
            frames: 8,
            frameBuffer: 15
        }
    }
}

//sprites for player
const playerAnimation = {
    idleLeft: {
        src: "./media/player_idle_left.png",
        frames: 15,
        frameBuffer: 10
    },
    idleRight: {
        src: "./media/player_idle_right.png",
        frames: 15,
        frameBuffer: 10
    },
    runRight: {
        src: "./media/player_run_right.png",
        frames: 15,
        frameBuffer: 5
    },
    runLeft: {
        src: "./media/player_run_left.png",
        frames: 15,
        frameBuffer: 5
    },
    jumpRight: {
        src: "./media/player_jump_right.png",
        frames: 15,
        frameBuffer: 10
    },
    jumpLeft: {
        src: "./media/player_jump_left.png",
        frames: 15,
        frameBuffer: 10
    }
}

//sprites for trap
const trapAnimation = {
    spin:{
        src: "./media/floor_trap.png",
        frames: 6,
        frameBuffer: 7
    }
}

//contains all the materials which the player can use for defense
let materials = {
    metalBox:{
        img: metalBoxImg,
        scale: 0.2,
        width: metalBoxImg.width * 0.2,
        height: metalBoxImg.height * 0.2,
        count: 10
    },
    cannon:{
        img: cannonImg,
        scale: 0.7,
        width: cannonImg.width * 0.7,
        height: cannonImg.height * 0.7,
        count: 2
    },
    trap:{
        img: trapImg,
        scale: 0.5,
        width: trapImg.width * 0.5,
        height: trapImg.height * 0.5,
        count: 3
    }
}

class Vector2D{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.magnitude = Math.sqrt( Math.pow(x , 2) + Math.pow(y, 2) );
    }

    subtract(v1){
        return new Vector2D(this.x - v1.x, this.y - v1.y);
    }

    add(v1){
        return new Vector2D(this.x + v1.x, this.y + v1.y);
    }
}

class Sprite{
    constructor(x, y, imageSrc, frameRate = 1, scale = 1){
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.frameBuffer = 30;
        this.frameRate = frameRate;
        this.currentFrame = 0;
        this.elapsedFrame = 0;
        this.image = new Image();
        this.image.src = imageSrc;
        this.isLoaded = false;

        // making sure the image is loaded before assigning width and height
        this.image.onload = () => {
            this.width = (this.image.width / this.frameRate) * this.scale;
            this.height = this.image.height * this.scale;
            this.positionVector = new Vector2D(this.x + (this.width)/2, this.y + (this.height)/2);
            this.isLoaded = true;
        }
    }

    draw(){
        if(!this.image) return;
        
        // defining the cropbox which can be used for animation
        this.cropBox = {
            x: this.currentFrame * (this.width / this.scale),
            y: 0,
            width: this.width / this.scale,
            height: this.height / this.scale
        }

        ctx.drawImage(
            this.image,
            this.cropBox.x,
            this.cropBox.y,
            this.cropBox.width,
            this.cropBox.height,
            this.x,
            this.y,
            this.width,
            this.height
        )
    }

    updateFrames(){
        this.elapsedFrame++;

        // changing sprites after certain frames 
        if(this.elapsedFrame % this.frameBuffer === 0){
            if(this.currentFrame < this.frameRate - 1) this.currentFrame++;
            else this.currentFrame = 0;
        }
    }
}

class Obstacle{
    constructor(x, y, width, height, mass){
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.class = "obstacle";
        this.health = 50;
        this.positionVector = new Vector2D(this.x + width/2, this.y + height/2);
        this.height = height;
        this.width = width;
        this.isGrounded = false;
        this.isColliding = false;
        this.canRender = true;
        this.canFall = true;

        // hitbox is the actual shape of the object which is used for calculating physics
        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
        this.velocity = new Vector2D(0, 0);
        rigidBodies.push(this);
    }

    draw(){
        ctx.drawImage(metalBoxImg, this.x, this.y, metalBoxImg.width * 0.2, metalBoxImg.height * 0.2);
    }

    update(){
        if(this.health<0) this.health = 0;

        if(shouldPanHorizontal) this.x = this.x - (player.velocity.x * deltaTime);

        if(isOnScreen(this)){
            this.draw();
        }
        
        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }

        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;

        this.positionVector.x = this.hitBox.x + this.hitBox.width/2;
        this.positionVector.y = this.hitBox.y + this.hitBox.height/2;
    }
}

class Cannon{
    constructor(x, y, width, height, mass){
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.class = "cannon-obstacle";
        this.health = 50;
        this.positionVector = new Vector2D(this.x + width/2, this.y + height/2);
        this.height = height;
        this.width = width;
        this.isGrounded = false;
        this.isColliding = false;
        this.canRender = true;
        this.canFall = true;
        this.canShoot = true;
        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
        this.gunTip = [this.hitBox.x - 15, this.hitBox.y + 68];  //assigning the position where the bullet should emerge from
        this.velocity = new Vector2D(0, 0);
        rigidBodies.push(this);
    }

    draw(){
        ctx.drawImage(cannonImg, this.x, this.y, this.width, this.height);
    }

    update(){
        if(this.health<0) this.health = 0;

        if(shouldPanHorizontal) this.x = this.x - (player.velocity.x * deltaTime); // to pan the object as the player moves

        if(isOnScreen(this)){
            this.draw();
        }
        
        this.hitBox = {
            x: this.x + 15,
            y: this.y + 25,
            width: this.width - 15,
            height: this.height - 25
        }

        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;

        this.gunTip = [this.hitBox.x - 25, this.hitBox.y + 44];
        drawProjectile(this.gunTip[0], this.gunTip[1], -bulletVelocity, 0);

        if(phase === "battle"){
            if(this.canShoot) shoot(this.gunTip[0], this.gunTip[1], bulletVelocity, 0, "left", false);
            this.canShoot = false;

            setTimeout( () => { this.canShoot = true; }, shootCoolDown );
        }

        this.positionVector.x = this.hitBox.x + this.hitBox.width/2;
        this.positionVector.y = this.hitBox.y + this.hitBox.height/2;
    }
}

class Player extends Sprite{
    constructor(x, y, mass, imageSrc, frameRate, scale = 0.5, animations){
        super(x, y, imageSrc, frameRate, scale);
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.class = "player";
        this.powerUp = "";
        this.health = 100;
        this.width = (this.image.width / this.frameRate) * this.scale;
        this.height = this.image.height * this.scale;
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;
        this.canFall = true;
        this.isGrounded = false;
        this.isColliding = false;
        this.facingRight = false;
        this.isImmune = false;
        this.facingLeft = true;
        this.canRender = true;
        this.isMoving = false;
        this.velocity = new Vector2D(0, 0);
        
        this.hitBox = {
            x: this.x + 35,
            y: this.y + 35,
            width: 50,
            height: 50,
        }
        
        this.gunTip = [ this.hitBox.x-10, this.hitBox.y+10 ];
        this.animations = animations;
        this.positionVector = new Vector2D(this.hitBox.x + (this.hitBox.width)/2, this.hitBox.y + (this.hitBox.height)/2);
        
        for (let key in this.animations) {
            const image = new Image();
            image.src = this.animations[key].src;
      
            this.animations[key].image = image;
        }
        
        rigidBodies.push(this);
    }

    switchSprite(key){
        if(this.image === this.animations[key].image || !this.isLoaded) {  // to avoid changing the same animation state every frame
            return;
        }

        this.currentFrame = 0;
        this.image = this.animations[key].image;
        this.frameBuffer = this.animations[key].frameBuffer;
        this.frameRate = this.animations[key].frames;

    }

    update(){
        if(this.health<0) this.health = 0;
        if(jetpackFuel <= 0) {
            jetpackFuel = 0;
        }
        if(!UP) {
            jetpackFuel += 0.01* deltaTime;
        }
        if(jetpackFuel > MAX_FUEL) jetpackFuel = MAX_FUEL;

        this.updateFacingDirection();

        // handling the sprite changes based on movements

        if(LEFT && !UP) this.switchSprite("runLeft");
        else if(RIGHT && !UP) this.switchSprite("runRight");
        else if(UP && jetpackFuel>0) {
            if(this.facingRight) this.switchSprite("jumpRight");
            else if(this.facingLeft) this.switchSprite("jumpLeft");
        }
        else {
            if(this.facingLeft) this.switchSprite("idleLeft");
            else if(this.facingRight) this.switchSprite("idleRight"); 
        }

        this.updateFrames();
        this.draw();

        this.hitBox.x = this.x + 120;
        this.hitBox.y = this.y + 7;
        this.hitBox.width = this.width - 250;
        this.hitBox.height = this.height - 50;
        
        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;

        if(this.facingLeft) this.gunTip = [ this.hitBox.x - 25, this.hitBox.y + 105 ];
        else if(this.facingRight) this.gunTip = [ this.hitBox.x +this.hitBox.width + 25, this.hitBox.y + 105 ];

        // drawing player's health
        drawRect(this.hitBox.x, this.hitBox.y-30, 100, 15, "#22272b");
        drawRect(this.hitBox.x, this.hitBox.y-30, this.health, 15, "green");

        //drawing fuel
        drawRect(100, 100, 200, 30, "#22272b");
        drawRect(100, 100, (jetpackFuel/MAX_FUEL) * 200, 30, "green");
        ctx.drawImage(fuelIcon, 50, 65, 100, 100);
        
        //drawing powerup logo
        if(this.powerUp.includes("ammunation")) ctx.drawImage(ammoPowerOrbImg, 80, 150, 50, 50);
        if(this.powerUp.includes("immunity")) ctx.drawImage(healthPowerOrbImg, 80, 220, 50, 50);

        //drawing projectile
        if(this.facingRight) drawProjectile(this.gunTip[0], this.gunTip[1], bulletVelocity, rotateAngle);
        else if(this.facingLeft) drawProjectile(this.gunTip[0], this.gunTip[1], -bulletVelocity, -rotateAngle);

        this.positionVector.x = this.hitBox.x + this.hitBox.width/2;
        this.positionVector.y = this.hitBox.y + this.hitBox.height/2;
    }

    updateFacingDirection(){
        // if(this.velocity.x < -THRESHOLD){
        //     this.facingRight = false;
        //     this.facingLeft = true;
        // }
        // else if(this.velocity.x > THRESHOLD){
        //     this.facingLeft = false;
        //     this.facingRight = true;
        // }

        if(LEFT){
            this.facingRight = false;
            this.facingLeft = true;
        }
        else if(RIGHT){
            this.facingLeft = false;
            this.facingRight = true;
        }
    }
}

class Bullet{
    constructor(x, y, radius){
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.height = 2*radius;
        this.width = 2*radius;
        this.class = "bullet";
        this.mass = 2;
        this.canFall = true;
        this.isGrounded = false;
        this.canRender = true;
        this.positionVector = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        rigidBodies.push(this);

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
    }

    draw(){
        ctx.beginPath();
        ctx.moveTo(this.x,this.y);
        ctx.fillStyle = "black";
        ctx.arc(this.x,this.y,this.radius, 0, 2*Math.PI);
        ctx.fill();
    }

    update(){
        this.draw();

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }

        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;
    }
}

class Zombie extends Sprite{
    constructor(x, y, mass, imageSrc, frameRate, scale = 0.5, animations){
        super(x, y, imageSrc, frameRate, scale);
        this.x = x;
        this.y = y;
        this.hitBox = {
            x: this.x + 35,
            y: this.y + 35,
            width: 50,
            height: 50
        }
        this.width = (this.image.width / this.frameRate) * this.scale;
        this.height = this.image.height * this.scale;
        this.mass = mass;
        this.health = 50;
        this.positionVector = new Vector2D(this.x + (this.width)/2, this.y + (this.height)/2);
        this.velocity = new Vector2D(0, 0);
        this.isGrounded = false;
        this.canFall = true;
        this.canRender = true;
        this.facingLeft = true;
        this.facingRight = false;
        this.isColliding = false;
        this.attackingPlayer = false;
        this.class = "zombie";
        rigidBodies.push(this);
        zombieCount++;

        this.animations = animations;

        for (let key in this.animations) {
            const image = new Image();
            image.src = this.animations[key].src;
      
            this.animations[key].image = image;
        }
    }

    updateFacingDirection(){
        if(this.velocity.x < -THRESHOLD){
            this.facingRight = false;
            this.facingLeft = true;
        }
        else if(this.velocity.x > THRESHOLD){
            this.facingLeft = false;
            this.facingRight = true;
        }
    }

    switchSprite(key){
        if(this.image === this.animations[key].image || !this.isLoaded) {
            return;
        }

        this.currentFrame = 0;
        this.image = this.animations[key].image;
        this.frameBuffer = this.animations[key].frameBuffer;
        this.frameRate = this.animations[key].frames;
    }

    update(){
        if(this.positionVector.x - player.positionVector.x === 0){
            this.switchSprite("idleLeft");
            this.velocity.x = 0;
            
        }
        else if(this.velocity.x>0){
            this.switchSprite("runRight");
        }
        else if(this.velocity.x<0){
            this.switchSprite("runLeft");
        }
        // console.log(this.x, this.y);
        if(this.health < 0) {
            this.health = 0;
        }

        if(shouldPanHorizontal) this.x -= (player.velocity.x * deltaTime);  //for dynamic camera
        this.attackingPlayer = false;
        
        this.updateFacingDirection();

        if(isOnScreen(this)){
            this.updateFrames();
            this.draw();
        }

        this.hitBox.x = this.x+35;
        this.hitBox.y = this.y+35;
        this.hitBox.width = this.width/2;
        this.hitBox.height = this.height - 40;

        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;

        //drawing health
        drawRect(this.hitBox.x, this.hitBox.y-30, 100, 15, "#22272b");
        drawRect(this.hitBox.x, this.hitBox.y-30, (this.health / 50) * 100, 15, "red");
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;

    }
}

class PowerOrb{
    constructor(x, y, img, scale = 0.2){
        this.x = x;
        this.y = y;
        this.height = img.height * scale;
        this.width = img.width * scale;
        this.scale = scale;
        this.img = img;
        this.class = "powerOrb";
        this.mass = 0;

        this.canFall = true;
        this.isGrounded = false;
        this.positionVector = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.power = null;

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }

        rigidBodies.push(this);
    }

    draw(){
        ctx.drawImage(this.img, this.x, this.y, this.img.width * this.scale, this.img.height * this.scale);
    }

    update(){
        if(shouldPanHorizontal) this.x = this.x - (player.velocity.x * deltaTime);

        if(isOnScreen(this)){
            this.draw();
        }

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }

        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;
    }
}

class Platform{
    constructor(x, y, width, height){
        this.x = x;
        this.y = canvas.height - platformImg.height*0.2 + 30;
        this.width = width;
        this.height = height;

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
    }

    draw(){
        if(shouldPanHorizontal) this.x -= player.velocity.x * deltaTime;
        this.y = canvas.height - platformImg.height*0.2 + 30;
        ctx.drawImage(platformImg, this.x, this.y, this.width, this.height);

        this.hitBox = {
            x: this.x,
            y: this.y + 30,
            width: this.width,
            height: this.height
        }

        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;

    }
}

class Trap extends Sprite{
    constructor(x, y, imageSrc, frameRate, scale = 0.5, animations){
        super(x, y, imageSrc, frameRate, scale);
        this.x = x;
        this.y = y;
        this.class = "trap";
        this.width = (this.image.width / this.frameRate) * this.scale;
        this.height = this.image.height * this.scale;

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: (this.image.width / this.frameRate) * this.scale,
            height: this.image.height * this.scale
        }

        traps.push(this);

        this.animations = animations;

        for (let key in this.animations) {
            const image = new Image();
            image.src = this.animations[key].src;
      
            this.animations[key].image = image;
        }
    }

    switchSprite(key){
        if(this.image === this.animations[key].image || !this.isLoaded) {
            return;
        }

        this.currentFrame = 0;
        this.image = this.animations[key].image;
        this.frameBuffer = this.animations[key].frameBuffer;
        this.frameRate = this.animations[key].frames;
    }

    update(){
        this.switchSprite("spin");

        if(isOnScreen(this)){
            this.updateFrames();
            this.draw();
        }

        if(shouldPanHorizontal) this.x -= (player.velocity.x * deltaTime);
        this.y = platform.hitBox.y - this.height;

        this.hitBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }

        this.hitBox.bottom = this.hitBox.y + this.hitBox.height;
        this.hitBox.top = this.hitBox.y;
        this.hitBox.left = this.hitBox.x;
        this.hitBox.right = this.hitBox.x + this.hitBox.width;
        
        this.bottom = this.y + this.height;
        this.top = this.y;
        this.left = this.x;
        this.right = this.x + this.width;
    }
}



pauseBtn.onclick = () => {
    isPaused = !isPaused;
    if(!isPaused) {
        lastTimeStamp = performance.now();      // assuming the last rendered frame is now to avoid incorrdect deltatime values
        if(phase === "pending") prepTimer();
        requestAnimationFrame(update);
        pauseBtn.firstChild.src = "./media/pause.png";
    }
    else{
        if(phase === "pending") clearTimeout(prepTimeoutId);
        pauseBtn.firstChild.src = "./media/play.png";
        materialBuffer = null;
        materialBufferImg = null;
        document.querySelectorAll("#materialsContainer div").forEach( btn => btn.classList.remove("selected") );
    }
}

metalBoxBtn.onclick = () => {
    if(isPaused) return;

    materialBuffer = "metalBox";
    materialBufferImg = metalBoxImg;
    document.querySelectorAll("#materialsContainer div").forEach( btn => btn.classList.remove("selected") );
    metalBoxBtn.classList.add("selected");
}

cannonBtn.onclick = () => {
    if(isPaused) return;

    materialBuffer = "cannon";
    materialBufferImg = cannonImg;
    document.querySelectorAll("#materialsContainer div").forEach( btn => btn.classList.remove("selected") );
    cannonBtn.classList.add("selected");
}

trapBtn.onclick = () => {
    if(isPaused) return;

    materialBuffer = "trap";
    materialBufferImg = trapImg;
    document.querySelectorAll("#materialsContainer div").forEach( btn => btn.classList.remove("selected") );
    trapBtn.classList.add("selected");
}

restartBtn.onclick = () => {
    gameOverWindow.style.visibility = "collapse";
    darkDiv.style.visibility = "collapse";
    loadScene();
}

leaderBoardBtn.onclick = () => {

    isPaused = true;

    if(phase === "pending") clearTimeout(prepTimeoutId);
    pauseBtn.firstChild.src = "./media/play.png";

    let tempStr = "", tempArr = JSON.parse(localStorage.getItem("leaderBoard"));

    tempArr.forEach( (item, index) => {
        tempArr[index] = Number(item);
    } )

    tempArr.sort((a, b) => {return b - a});

    if(localStorage.getItem("leaderBoard")){
        tempArr.forEach( (score, index) => {
            if(index > 10) return;
            tempStr += `\n${score}`;
        } );
    }

    leaderBoardDisplay.innerText = tempStr;
    
    darkDiv.style.visibility = "visible";
    leaderBoardWindow.style.visibility = "visible";
}

playBtn.onclick = () => {
    
    isPaused = false;

    lastTimeStamp = performance.now();
    if(phase === "pending") prepTimer();
    requestAnimationFrame(update);
    pauseBtn.firstChild.src = "./media/pause.png";

    leaderBoardWindow.style.visibility = "collapse";
    darkDiv.style.visibility = "collapse";
}

startBtn.onclick = () => {
    phase = "battle";
}

// for resizing the canvas when the window size is changed
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
  
window.addEventListener("resize", resizeCanvas);

//loading the game scene
loadScene();

//function for drawing rectangles
function drawRect(x, y, width, height, colour){
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fillStyle = colour;
    ctx.fill();
}

document.addEventListener("keydown", (e) => {
    if(e.key === " " || e.key === "ArrowUp" || e.key === "w"){
        UP = true;
    }
    if(e.key === "ArrowLeft" || e.key === "a"){
        LEFT = true;
    }
    if(e.key === "ArrowRight" || e.key === "d"){
        RIGHT = true;
    }
});

document.addEventListener("keyup", (e) => {
    if(e.key === " " || e.key === "ArrowUp" || e.key === "w"){
        UP = false;
    }
    if(e.key === "ArrowLeft" || e.key === "a"){
        LEFT = false;
    }
    if(e.key === "ArrowRight" || e.key === "d"){
        RIGHT = false;
    }
});

document.addEventListener("wheel", e => {
    if(e.deltaY < 0) rotateAngle -= (Math.PI/50);
    else rotateAngle += (Math.PI/50);

    if(rotateAngle > Math.PI/4) rotateAngle = Math.PI/4;
    else if(rotateAngle < -Math.PI/4) rotateAngle = -Math.PI/4;

});

document.addEventListener("click", playBackgroundMusic); // making sure the user intracts with the DOM before playing music

canvas.addEventListener("click", (e) => {

    if(phase === "battle" || phase === "war"){
        if(!canShoot) return;
        if(player.facingRight) shoot(player.gunTip[0], player.gunTip[1], (bulletVelocity + player.velocity.magnitude), rotateAngle, "right");
        else if(player.facingLeft) shoot(player.gunTip[0], player.gunTip[1], (bulletVelocity + player.velocity.magnitude), rotateAngle, "left");
    }
    else{ // when the game is in preperation state where player can place defensive items
        
        try{
            if(materials[materialBuffer].count <= 0){
                popupDisplay(`Out of ${materialBuffer} :(`);
                return;
            }
        }
        catch{
            popupDisplay("Please Select Something :)");
        }
        if(e.y >= platform.hitBox.y - (materialBufferImg.height * materials[materialBuffer].scale)) return; //to make sure the player doesn't place the block below the platform

        switch (materialBuffer){
            case "metalBox":
                let obstacle = new Obstacle(e.x, e.y, materials[materialBuffer].width, materials[materialBuffer].height, 100);
                materials[materialBuffer].count--;
                break;
            
            case "cannon":
                let cannon = new Cannon(e.x, e.y, materials[materialBuffer].width, materials[materialBuffer].height, 100);
                materials[materialBuffer].count--;
                break;
            case "trap":
                let trap = new Trap(e.x, platform.hitBox.y - materials.trap.height * 0.5, trapAnimation.spin.src, trapAnimation.spin.frames, 0.5, trapAnimation);
                materials[materialBuffer].count--;
                break;
        }
    }
    
});

canvas.addEventListener("mousemove", (e) => {
    mouseX = e.x;
    mouseY = e.y;

    if(materialBufferImg){
        if(mouseY >= platform.hitBox.y - (materialBufferImg.height * materials[materialBuffer].scale)) mouseY = platform.hitBox.y - (materialBufferImg.height * materials[materialBuffer].scale);
        console.log(materialBufferImg.height)
    };
});

function loadScene(){
    rigidBodies = [], platforms = [], traps = [];

    if(localStorage.getItem("leaderBoard")) leaderBoard = JSON.parse(localStorage.getItem("leaderBoard")); //getting leaderboard from local storage for adding further details
    
    canShoot = true, isPaused = false, shouldPanHorizontal = false,isGameOver = false, jetpackFuel = MAX_FUEL, materialBuffer = null, materialBufferImg = null;
    zombieState = "runLeft", playerState = "runRight", phase = "prep";
    frameCount = 0, secondsPassed = 0, deltaTime = 0, lastTimeStamp = 0, playerScore = 0, currentTime = 0, rotateAngle = 0, zombieCount = 0;

    materials = {
        metalBox:{
            img: metalBoxImg,
            scale: 0.2,
            width: metalBoxImg.width * 0.2,
            height: metalBoxImg.height * 0.2,
            count: 10
        },
        cannon:{
            img: cannonImg,
            scale: 0.7,
            width: cannonImg.width * 0.7,
            height: cannonImg.height * 0.7,
            count: 2
        },
        trap:{
            img: trapImg,
            scale: 0.5,
            width: trapImg.width * 0.5,
            height: trapImg.height * 0.5,
            count: 3
        }
    }

    clearTimeout(prepTimeoutId);
    clearTimeout(zombieSpawnTimeoutId);

    player = new Player(canvas.width/2, 200, 50, playerAnimation[playerState].src, playerAnimation[playerState].frames, 0.4, playerAnimation);
    platform = new Platform(0, canvas.height - platformImg.height*0.2 + 30, platformImg.width * 0.2, platformImg.height * 0.2);
    platforms.push(platform);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    resizeCanvas();

    requestAnimationFrame(update);

    updateFrameCount();

}

function playBackgroundMusic(){
    backgroundMusic.play()
    .catch((error) => {console.error("Error playing Bg music:", error)});

    document.removeEventListener("click", playBackgroundMusic);
}

function gameOver(){
    isPaused = true;
    isGameOver = true;
    scoreDisplay.textContent = `Score: ${playerScore}`;
    gameOverWindow.style.visibility = "visible";
    darkDiv.style.visibility = "visible";

    leaderBoard.push(playerScore);

    localStorage.setItem("leaderBoard", JSON.stringify(leaderBoard));
}

//function that runs every frame
function update(timeStamp){

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height); //clearing the canvas before each frame

    // deltatime is the time elapsed between rendering two frames
    if(!isPaused){
        deltaTime = (timeStamp - lastTimeStamp) / perfectFrameTime; //perfectframetime is the time diff between two frames in a 60fps game
        lastTimeStamp = timeStamp; 
    }

    //condition for panning
    if(player.x < 100 && player.velocity.x < 0) shouldPanHorizontal = true;
    else if(player.x > canvas.width - 500 && player.velocity.x > 0) shouldPanHorizontal = true;
    else shouldPanHorizontal = false;

    //deleting platforms that aren't inside the canvas
    platforms.forEach( (platform, i) => {
        if( platform.left > canvas.width || platform.right < 0 ) platforms.splice(i, 1);
    } )

    //handeling phase operations
    if(phase === "prep"){
        prepTimer();

        materialsConatiner.style.visibility = "visible";

        phase = "pending";
    }
    else if(phase === "battle"){
        spawnZombies();

        cannonShoot();

        materialsConatiner.style.visibility = "collapse";
        phase = "war";
    }
    else if(phase === "pending"){
        ctx.globalAlpha = 0.5;
        if(materialBufferImg) ctx.drawImage(materialBufferImg, mouseX, mouseY, materials[materialBuffer].width, materials[materialBuffer].height);
        ctx.globalAlpha = 1;
    }

    zombieCount = countZombies(rigidBodies);

    // checking if zombie collides with traps
    traps.forEach(trap => {
        rigidBodies.forEach( (object, index) => {
            if(object.class.includes("zombie")){
                if(didCollide(trap.hitBox, object.hitBox)){
                    if(object.health <= 0){
                        rigidBodies.slice(index, 1);
                        return;
                    }
                    object.health -= 0.1 * deltaTime;
                }
            }
        } )
    })

    // generation of infinite platform
    if(platforms[platforms.length-1].right < canvas.width) {
        let platform1 = new Platform(platforms[platforms.length-1].right, canvas.height - platformImg.height*0.2 + 30, platformImg.width * 0.2, platformImg.height * 0.2);
        platforms.push(platform1);
    }
    if(platforms[0].left > 0) {
        let platform1 = new Platform(platforms[0].left - platformImg.width * 0.2, canvas.height - platformImg.height*0.2 + 30, platformImg.width * 0.2, platformImg.height * 0.2);
        platforms.unshift(platform1);
    }
    
    //physics being added
    collisionResponse(rigidBodies);
    applyGravity(rigidBodies);
    move(rigidBodies);
    
    //rendering objects
    platforms.forEach( platform => platform.draw() );
    rigidBodies.forEach( rigidBody => {rigidBody.update();} );
    traps.forEach( trap => trap.update() );
    
    // updating fps count
    frameCount++;

    let temp = frameCount / secondsPassed;
    temp = temp.toString();
    temp = temp.slice(0, 3);
    ctx.fillStyle = "yellow";
    ctx.font = "30px Poppins";
    ctx.fillText(`FPS: ${temp}`, 300, 50);
    ctx.fillText(`Score: ${playerScore}`, 100, 50);
    if(phase !== "battle") countDown.textContent = `Time Left: ${MAX_PREP_TIME - currentTime}`;

    if(!isPaused) requestAnimationFrame(update);
}

function applyGravity(objects){
    objects.forEach( object => {
        if(object.class === "player"){
            if(!object.isGrounded) object.velocity.y += (gravity * deltaTime);
    
            if(object.hitBox.y >= (platform.hitBox.y-object.hitBox.height)){
                object.y = platform.hitBox.y - object.height + object.bottom - object.hitBox.bottom;
                object.velocity.y = 0;
                
                object.isGrounded = true;
            }
            return;
        }
        
        if(object.canFall){
            if(!object.isGrounded) object.velocity.y += (gravity * deltaTime);
    
            if(object.hitBox.y >= (platform.hitBox.y-object.hitBox.height)){
                object.y = platform.hitBox.y - object.height + object.bottom - object.hitBox.bottom;
                object.isGrounded = true;
            }
        }
    } )
}

//function that moves the objects based on their velocities
function move(objects){
    
    objects.forEach( (object, index) => {
        if(object.class === "player"){
            if(LEFT) {
                object.velocity.x -= (playerHorizotalAcceleration * deltaTime);
            }
            if(RIGHT) {
                object.velocity.x += (playerHorizotalAcceleration * deltaTime);
            }
            if(UP){

                jetpackFuel -= 0.03 * deltaTime;
                if(jetpackFuel > 0){
                    object.velocity.y -= (playerJumpVelocity * deltaTime);
                }
            }
        }

        if(object.class.includes("zombie")){
            if(object.isColliding && object.class === "zombie") object.velocity.x = 0;
            else if(object.attackingPlayer) object.velocity.x = 0;
            else{
                object.velocity.x += (Math.sign(player.positionVector.x - object.positionVector.x) * zombieSpeed) * deltaTime;
                if( player.positionVector.x - object.positionVector.x === 0 ) {
                    object.velocity.x = 0;
                    object.switchSprite("idleLeft");
                }
            }
        }

        if(object.class !== "bullet" && object.class !== "snowball"){
            if(object.isGrounded) object.velocity.x *= 1 - friction;
            else object.velocity.x *= 1 - airDrag;
        }

        if( Math.abs(object.velocity.x) >= MAX_VELOCITY ) object.velocity.x = Math.sign(object.velocity.x) * MAX_VELOCITY;

        if(!shouldPanHorizontal) object.x += (object.velocity.x * deltaTime);
        object.y += (object.velocity.y * deltaTime);

        if(object.hitBox.y > (platform.hitBox.y - object.hitBox.height)) {
            if(object.class === "bullet" || object.class === "snowball") setTimeout(() => {objects.splice(index, 1);}, 100);
            object.y = platform.hitBox.y - object.height + object.bottom - object.hitBox.bottom;
            object.velocity.y = 0;
            object.isGrounded = true;
        }
    
        if(Math.abs(object.velocity.x) < THRESHOLD) object.velocity.x = 0;
        if(Math.abs(object.velocity.y) < THRESHOLD) object.velocity.y = 0;

        object.positionVector.x = object.hitBox.x + (object.hitBox.width/2);
        object.positionVector.y = object.hitBox.y + (object.hitBox.height/2);

    } )
}

//function that handles the collison response
function collisionResponse(rigidBodies){
    rigidBodies.forEach( rigidBody => {rigidBody.isGrounded = false; rigidBody.isColliding = false;} );

    rigidBodies.forEach( (rigidBody, i) =>{
        for(j=i+1; j<rigidBodies.length; j++){
            let object1 = rigidBodies[i];
            let object2 = rigidBodies[j];

            if(object1.health === 0) {
                if(object1.class.includes("zombie")){
                    dropPowerOrb(object1.positionVector.x, object1.positionVector.y);
                    zombieCount--;
                    playerScore++;
                }
                else if(object1.class === "player"){
                    gameOver();
                }
                rigidBodies.splice(i, 1);
            }
            else if(object2.health === 0){
                if(object2.class.includes("zombie")){
                    dropPowerOrb(object2.positionVector.x, object2.positionVector.y);
                    zombieCount--;
                    playerScore++;
                }
                else if(object2.class === "player"){
                    gameOver();
                }
                rigidBodies.splice(j, 1);
            }

            if(didCollide(object1.hitBox, object2.hitBox)){

                if(object1.class === "player" && object2.class === "powerOrb"){
                    if(object2.power === "immunity") increaseImmunity();
                    else if(object2.power === "ammunation") increaseAmmunation();
                    rigidBodies.splice(j, 1);
                    return;
                }
                else if(object2.class === "player" && object1.class === "powerOrb"){
                    if(object1.power === "immunity") increaseImmunity();
                    else if(object1.power === "ammunation") increaseAmmunation();
                    rigidBodies.splice(i, 1);
                    return;
                }

                if(object1.class === "powerOrb" || object2.class === "powerOrb") return;

                if(object1.class === "bullet" && object2.class.includes("zombie")){
                    object2.health -= bulletDamage;
                    rigidBodies.splice(i, 1);
                    return;
                }
                else if(object1.class.includes("zombie") && object2.class === "bullet"){
                    object1.health -= bulletDamage;
                    rigidBodies.splice(j, 1);
                    return;
                }

                if(object1.class === "player" && object2.class.includes("zombie")){
                    if(!player.isImmune) object1.health -= zombieDamage * deltaTime;
                    object2.velocity.x = 0;
                    object2.isColliding = true;
                    object2.attackingPlayer = true;
                    if(object2.facingRight) object2.switchSprite("attackRight");
                    else if(object2.facingLeft) object2.switchSprite("attackLeft");
                }
                else if(object1.class.includes("zombie") && object2.class === "player"){
                    if(!player.isImmune) object2.health -= zombieDamage * deltaTime;
                    object1.velocity.x = 0;
                    object1.isColliding = true;
                    object1.attackingPlayer = true;
                    if(object1.facingRight) object1.switchSprite("attackRight");
                    else if(object1.facingLeft) object1.switchSprite("attackLeft");
                }

                if(object1.class.includes("obstacle") && object2.class === "zombie"){
                    object1.health -= zombieDamage * deltaTime;
                    object1.velocity.x = 0;
                    object2.velocity.x = 0;
                    object1.isColliding = true;
                    object2.isColliding = true;
                    if(object2.facingRight) object2.switchSprite("attackRight");
                    else if(object2.facingLeft) object2.switchSprite("attackLeft");
                }
                else if(object1.class === "zombie" && object2.class.includes("obstacle")){
                    object2.health -= zombieDamage * deltaTime;
                    object1.velocity.x = 0;
                    object2.velocity.x = 0;
                    object1.isColliding = true;
                    object2.isColliding = true;
                    if(object1.facingRight) object1.switchSprite("attackRight");
                    else if(object1.facingLeft) object1.switchSprite("attackLeft");
                }

                //reference vector i.e vector difference of the two objects' posiitonVector when their corners touches
                let refVec = object2.positionVector.subtract(new Vector2D(object2.hitBox.x-object1.hitBox.width/2, object2.hitBox.y-object1.hitBox.height/2));
                
                //resulting vector i.e vector difference of the two objects' posiitonVector at current position
                let resVec = object2.positionVector.subtract(object1.positionVector);
                
                //by knowing how much a component of the resulting vector deviates from the 
                //other we can easily identify which side the objects are colliding

                if ( Math.abs(resVec.y) - Math.abs(resVec.x) >= Math.abs(refVec.y) - Math.abs(refVec.x) ){ //here the object collide in the y axis i.e in either top or bottom side
                    if(resVec.y > 0){
                        object1.y = object2.hitBox.y - object1.hitBox.height + (object1.top - object1.hitBox.top);

                        object1.isGrounded = true;
                        if(object1.class !== "zombie" || object2.class !== "zombie"){
                            object1.isColliding = true;
                            object2.isColliding = true;
                        }

                        let velocities = velocitiesAfterColl(object1.velocity.y, object2.velocity.y, object1.mass, object2.mass);
                        object1.velocity.y = velocities[0];
                        object2.velocity.y = velocities[1];

                    }
                    else {
                        object2.y = object1.hitBox.y - object2.hitBox.height + (object2.top - object2.hitBox.top);

                        let velocities = velocitiesAfterColl(object1.velocity.y, object2.velocity.y, object1.mass, object2.mass);
                        object1.velocity.y = velocities[0];
                        object2.velocity.y = velocities[1];
                        object2.isGrounded = true;
                        if(object1.class !== "zombie" || object2.class !== "zombie"){
                            object1.isColliding = true;
                            object2.isColliding = true;
                        }
                    }
                }
                else{
                    if(resVec.x > 0) {
                        object1.x = object2.hitBox.x - object1.hitBox.width - (object1.hitBox.left - object1.left);
                        let velocities = velocitiesAfterColl(object1.velocity.x, object2.velocity.x, object1.mass, object2.mass);
                        object1.velocity.x = velocities[0];
                        object2.velocity.x = velocities[1];
                        object1.isGrounded = false;
                        if(object1.class !== "zombie" || object2.class !== "zombie"){
                            object1.isColliding = true;
                            object2.isColliding = true;
                        }
                    }
                    else {
                        object1.x = object2.hitBox.x + object2.hitBox.width + (object1.left - object1.hitBox.left);
                        let velocities = velocitiesAfterColl(object1.velocity.x, object2.velocity.x, object1.mass, object2.mass);
                        object1.velocity.x = velocities[0];
                        object2.velocity.x = velocities[1];
                        object1.isGrounded = false;
                        if(object1.class !== "zombie" || object2.class !== "zombie"){
                            object1.isColliding = true;
                            object2.isColliding = true;
                        }
                    }

                    if(object1.class.includes("obstacle") && object2.class === "climber-zombie"){
                        if(object2.y <= ((8 * canvas.height) / 10)) object2.velocity.y = zombieJumpVelocity;
                        object2.isGrounded = false;
                    }
                    else if(object1.class === "climber-zombie" && object2.class.includes("obstacle")){
                        if(object1.y <= ((8 * canvas.height) / 10)) object1.velocity.y = zombieJumpVelocity;
                        object1.isGrounded = false;
                    }
                }
            }
            else{
                object1.isGrounded |= false;
                object2.isGrounded |= false;
                object1.isColliding |= false;
                object2.isColliding |= false;
            }
        }

    } );
}

//checking collision
function didCollide(rect1, rect2){

    if( rect1.x + rect1.width >= rect2.x &&
        rect1.x <= rect2.x + rect2.width &&
        rect1.y <= rect2.y + rect2.height &&
        rect1.y + rect1.height >= rect2.y
    ){
        return true;
    }
    else{
        
        return false;
    }
}

//calculating resultant velocities of the body after collision using conservation of momentum
function velocitiesAfterColl(u1, u2, m1, m2, e = 0.5){
    let v1, v2;

    v1 = ((m1-(e*m2))/(m1+m2))*u1 +  ((m2*(1+e))/(m1+m2))*u2;
    v2 = ((m1*(1+e))/(m1+m2))*u1 + ((m2-(e*m1))/(m1+m2))*u2;

    return [v1, v2];
}

//function for drawing projectile
function drawProjectile(x, y, v, angle, colour = "black"){
    let dt = 0.1, x1 = x, y1 = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "white";
    ctx.setLineDash([5, 10]);
    
    for (let t = 0; t < 100; t += dt) {
        const vx = v * Math.cos(angle);
        const vy = -v * Math.sin(angle) - (gravity * t);
        x1 += vx * dt;
        y1 -= vy * dt;

        ctx.lineTo(x1, y1);

    }
    ctx.stroke();
    ctx.setLineDash([0, 0]);
}

function countZombies(bodies) {
    return bodies.filter(body => body.class.includes("zombie")).length;
}

function isOnScreen(object) {
    return object.x + object.width > 0 && object.x < canvas.width &&
           object.y + object.height > 0 && object.y < canvas.height;
}

//updating framecount for displaying fps
function updateFrameCount(){
    secondsPassed++;
    setTimeout( updateFrameCount, 1000 );
}

function shoot(x, y, velocity, angle, facing, shotByPlayer = true){
    let bullet1 = new Bullet(x, y, 10);

    if(facing === "right") bullet1.velocity.x = velocity * Math.cos(angle);
    else bullet1.velocity.x = -velocity * Math.cos(angle);

    bullet1.velocity.y = velocity * Math.sin(angle);

    if(shotByPlayer){
        canShoot = false;
        player.velocity.x -= ((bullet1.velocity.x * bullet1.mass) / player.mass) * 100; //recoil of gun
        setTimeout( () => { canShoot = true; }, shootCoolDown );
    }
}

function cannonShoot(){
    rigidBodies.forEach( cannon => {
        if(cannon.class.includes("cannon")){
            if(cannon.canShoot) shoot(cannon.gunTip[0], cannon.gunTip[1], bulletVelocity, 0, "left", false);
        }
    } )
    setTimeout( () => {cannonShoot();}, 3500 );
}

//timer for the preperation phase
function prepTimer(){
    currentTime++;

    if(currentTime === MAX_PREP_TIME) {
        currentTime = 0;
        phase = "battle";
        canShoot = true;
        return;
    }

    prepTimeoutId = setTimeout(prepTimer, 1000);
}

//spawing zombies with a 20% chance of it being a jumper one
function spawnZombies(){
    if(zombieCount < MOB_CAP_COUNT){  // making sure that the number of zombies is always under the mop cap
        let zombie;
        if(Math.random() > 0.8){
            if(Math.random() > 0.5) zombie = new Zombie(canvas.width + 250, 0, 50, zombieAnimation.climberZombie[zombieState].src, zombieAnimation.climberZombie[zombieState].frames, 0.4, zombieAnimation.climberZombie);
            else zombie = new Zombie(- 250, 0, 50, zombieAnimation.climberZombie[zombieState].src, zombieAnimation.climberZombie[zombieState].frames, 0.4, zombieAnimation.climberZombie);
            zombie.class = "climber-zombie";
        }
        else {
            if(Math.random() > 0.5) zombie = new Zombie(canvas.width + 250, 0, 50, zombieAnimation.normalZombie[zombieState].src, zombieAnimation.normalZombie[zombieState].frames, 0.4, zombieAnimation.normalZombie);
            else zombie = new Zombie(- 250, 0, 50, zombieAnimation.normalZombie[zombieState].src, zombieAnimation.normalZombie[zombieState].frames, 0.4, zombieAnimation.normalZombie);
            zombie.class = "zombie";
        }
    }

    if(!isGameOver) zombieSpawnTimeoutId = setTimeout(spawnZombies , 2000);
}

//droping powerups with 20% chance when a zombie is killed
function dropPowerOrb(x, y){
    if(Math.random() < 0.8) return;
    
    let availablePowers = ["immunity", "ammunation"], powerUp;
    
    if(Math.random() <= 0.5){
        powerUp = availablePowers[0];
        let powerOrb = new PowerOrb(x, y, healthPowerOrbImg, 0.05);
        powerOrb.power = "immunity";
    }else{
        powerUp = availablePowers[1];
        let powerOrb = new PowerOrb(x, y, ammoPowerOrbImg, 0.05);
        powerOrb.power = "ammunation";
    }
}

//decreasing shooting cooldown time thus increasing ammunation rate
function increaseAmmunation(){
    shootCoolDown /= 2;
    player.powerUp += "ammunation";
    setTimeout( () => {shootCoolDown *= 2; player.powerUp = player.powerUp.replace("ammunation", "");}, powerUpTime );
}

//making player immune from attacks for certain time
function increaseImmunity(){
    player.isImmune = true;
    player.powerUp += "immunity";
    setTimeout( () => {player.isImmune = false; player.powerUp = player.powerUp.replace("immunity", "");}, powerUpTime );
}

// Creates a pop up box near the corner with the given text
function popupDisplay(text){
    const popupDiv = document.createElement("div");
    
    popupDiv.classList.add("popup");
    popupDiv.innerText = text;
    popupDiv.style.visibility = "visible";
    popupDiv.style.animation = `slideRight ${POPUP_TIME}ms`;
    document.body.append(popupDiv);
    setTimeout( () => {popupDiv.style.visibility = "collapse"; document.body.removeChild(popupDiv);}, POPUP_TIME );
}