var Mode = require('./Mode');
var Vec2 = require('../modules/Vec2');
var Entity = require('../entity');


function Hunger() {

    Mode.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 4;
    this.name = "Hunger Games";
    this.specByLeaderboard = false;
    this.packetLB = 48;

    // Gamemode Specific Variables
    this.aFixedPlayerPos = [];
    this.aFixedVirusPos = [];
    this.connectedPlayers = 0;
    this.restarting = false;
    
    this.triggerOneSecond = false;
    this.tickOneSecond = 0;

    this.counter = 0;
    this.m = 0;
    this.s = 0;

    this.events = [];
    
    // Config
    this.oneSecondInterval = 25;    // GameServer.js@timerLoop:~534 | ~25 is a factor of one second within this implementation
    this.matchLength = 20;          // Minutes
    this.joinInterval = 15;         // Seconds
}


module.exports = Hunger;
Hunger.prototype = new Mode();


// Gamemode Specific Functions

Hunger.prototype.startGame = function (gameServer) {

    if(this.triggerOneSecond) {
        this.counter = this.joinInterval;
        return;
    }

    this.triggerOneSecond = true;
    this.counter = this.joinInterval;
    this.restarting = false;
    this.events.push(0);

};

Hunger.prototype.triggerGameStart = function(gameServer) {

    gameServer.disableSpawn = true;

    for(var i = 0; i < gameServer.clients.length; i++)
        gameServer.clients[i].playerTracker.frozen = false;

    this.m = this.matchLength;

};

Hunger.prototype.triggerGameEnd = function(gameServer) {

    for(var i = 0; i < gameServer.clients.length; i++) {

        var playerTracker = gameServer.clients[i].playerTracker;
        while(playerTracker.cells.length > 0)
            gameServer.removeNode(playerTracker.cells[0]);

    }

    gameServer.disableSpawn = false;
    this.triggerOneSecond = false;
    this.restarting = false;
    this.counter = 0;
    this.connectedPlayers = 0;

};

Hunger.prototype.setupArena = function (gameServer) {

    while (gameServer.nodesEjected.length)
        gameServer.removeNode(gameServer.nodesEjected[0]);

// Hunger Games mode Viruses specific fixed postions

    // Remove All Viruses (they respawn in random locations during the game)
    while(gameServer.nodesVirus.length)
        gameServer.removeNode(gameServer.nodesVirus[0]);

    // Spawn new Viruses in fixed positions
    for(var i = 0; i < this.aFixedVirusPos.length; i++) {

        var virus = new Entity.Virus(gameServer, null, this.aFixedVirusPos[i], gameServer.config.virusMinSize);
        if (!gameServer.willCollide(gameServer.config.virusMinSize, virus))
            gameServer.addNode(virus);

    }

};

Hunger.prototype.oneSecondEvents = function(gameServer) {

    if (this.counter > 0) {
        this.counter--;
        return;
    }


    if (this.s > 0) {
        this.s--;
        return;
    } else if (this.m > 0){
        this.m--;
        this.s = 59;
        return;
    }


    for(var i = 0; i < this.events.length; i++) {
        var event = this.events.splice(0, 1);
        if(event == 0)
            this.triggerGameStart(gameServer);
        else if(event == 1)
            this.triggerGameEnd(gameServer);
    }

};

// Override

Hunger.prototype.onPlayerSpawn = function (gameServer, player) {

    if(gameServer.disableSpawn)
        return;


    player.setColor(gameServer.getRandomColor());
    player.frozen = true;
    // Spawn player
    gameServer.spawnPlayer(player, this.aFixedPlayerPos[this.connectedPlayers]);


    this.connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            this.connectedPlayers++;


    if(this.connectedPlayers > 1) {
        // @2. Waiting for second player to trigger actual game start (each next player will delay server start for 15 seconds)
        this.startGame(gameServer);

    } else {
        // @1. 1st player (re)join server, (re)setup the arena
        this.setupArena(gameServer);

    }

};

Hunger.prototype.updateLB = function (gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    var tempLB = [];

    var players = this.connectedPlayers;

    lb[0] = 'Awaiting Players:';
    lb[1] = players + '/' + gameServer.config.serverMaxConnections;
    if(players < 2)
        return;

    if(!gameServer.disableSpawn) {
        lb[2] = 'Game starting in:';
        lb[3] = this.counter.toString();
        return;
    }

    players = 0;
    var potentialWinner = '';
    for (var i = 0, pos = 0; i < gameServer.clients.length; i++) {
        var player = gameServer.clients[i].playerTracker;
        if (player.isRemoved || !player.cells.length || 
            player.socket.isConnected == false || player.isMi)
            continue;

        players++;

        for (var j = 0; j < pos; j++)
            if (tempLB[j]._score < player._score) break;

        tempLB.splice(j, 0, player);
        pos++;
        potentialWinner = tempLB[0]._name;
    }
    this.rankOne = tempLB[0];


    // Monitor Game
    if(!this.restarting && (players <= 1 || !(this.m > 0 || this.s > 0))) {

        if(players > 1)
            for(var i = 0; i < gameServer.clients.length; i++)
                gameServer.clients[i].playerTracker.frozen = true;
        
        this.m = this.s = 0;
        this.counter = 5;
        this.restarting = true;
        this.events.push(1);

    }


    if(players == 1 || this.restarting) {
        lb[0] = potentialWinner;
        lb[1] = 'WINS!';
        lb[2] = (players > 1 && this.restarting ? 'Left Total: ' + players : 'Flowless Victory!');
        lb[3] = 'Restart in:';
        lb[4] = this.counter.toString(); 
        return;
    }

    lb[0] = 'Players Remaining:';
    lb[1] = players + '/' + gameServer.config.serverMaxConnections;
    lb[2] = 'Time Limit:';
    lb[3] = this.m + ':' + (this.s < 10 ? '0': '') + this.s;

};

Hunger.prototype.onTick = function(gameServer) {

    if(this.triggerOneSecond)
        if(this.tickOneSecond >= this.oneSecondInterval) {
            this.tickOneSecond = 0;
            this.oneSecondEvents(gameServer);

        } else {
            this.tickOneSecond++;

        }

};

Hunger.prototype.onServerInit = function (gameServer) {

// PLAYERs fixed pos
    this.aFixedPlayerPos = [
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1000,
                    gameServer.border.miny + gameServer.border.height / 2 - 1800
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1000,
                    gameServer.border.miny + gameServer.border.height / 2 + 1800
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1000,
                    gameServer.border.miny + gameServer.border.height / 2 + 1800
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1000,
                    gameServer.border.miny + gameServer.border.height / 2 - 1800
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 2000,
                    gameServer.border.miny + gameServer.border.height / 2
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 2000,
                    gameServer.border.miny + gameServer.border.height / 2
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2,
                    gameServer.border.miny + gameServer.border.height / 2 - 2000
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2,
                    gameServer.border.miny + gameServer.border.height / 2 + 2000
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1800,
                    gameServer.border.miny + gameServer.border.height / 2 - 1000
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1800,
                    gameServer.border.miny + gameServer.border.height / 2 + 1000
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1800,
                    gameServer.border.miny + gameServer.border.height / 2 + 1000
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1800,
                    gameServer.border.miny + gameServer.border.height / 2 - 1000
                )
        ];


// VIRUSes fixed pos
    this.aFixedVirusPos = [

            // CENTER VIRUS SETUP
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2,
                    gameServer.border.miny + gameServer.border.height / 2 - 700
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 700,
                    gameServer.border.miny + gameServer.border.height / 2
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2,
                    gameServer.border.miny + gameServer.border.height / 2 + 700
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 700,
                    gameServer.border.miny + gameServer.border.height / 2
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1200,
                    gameServer.border.miny + gameServer.border.height / 2 - 1200
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 400,
                    gameServer.border.miny + gameServer.border.height / 2 - 1600
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1600,
                    gameServer.border.miny + gameServer.border.height / 2 - 400
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1200,
                    gameServer.border.miny + gameServer.border.height / 2 - 1200
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 400,
                    gameServer.border.miny + gameServer.border.height / 2 - 1600
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1600,
                    gameServer.border.miny + gameServer.border.height / 2 - 400
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1200,
                    gameServer.border.miny + gameServer.border.height / 2 + 1200
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 400,
                    gameServer.border.miny + gameServer.border.height / 2 + 1600
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 + 1600,
                    gameServer.border.miny + gameServer.border.height / 2 + 400
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1200,
                    gameServer.border.miny + gameServer.border.height / 2 + 1200
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 400,
                    gameServer.border.miny + gameServer.border.height / 2 + 1600
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width / 2 - 1600,
                    gameServer.border.miny + gameServer.border.height / 2 + 400
                ),

            // CORNER ONES
            new Vec2(
                    gameServer.border.minx + 500,
                    gameServer.border.miny + 500
                ),
            new Vec2(
                    gameServer.border.minx + 500,
                    gameServer.border.miny + gameServer.border.height - 500
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width - 500,
                    gameServer.border.miny + 500
                ),
            new Vec2(
                    gameServer.border.minx + gameServer.border.width - 500,
                    gameServer.border.miny + gameServer.border.height - 500
                )
        ];

};