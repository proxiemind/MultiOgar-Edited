var Duell = require('./Duell');
var Vec2 = require('../modules/Vec2');
var Entity = require('../entity');


function Hunger() {

    Duell.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 5;
    this.name = "Hunger Games";
    this.specByLeaderboard = false;
    this.packetLB = 48;

    // Gamemode Specific Variables
    this.aFixedPlayerPos = [];
    this.aFixedVirusPos = [];

    // Config
    this.matchLength = 15;          // Minutes
    this.joinInterval = 10;         // Seconds
    // this.restartInterval = 7;       // Seconds
}


module.exports = Hunger;
Hunger.prototype = new Duell();


// Gamemode Specific Functions
// Override

Hunger.prototype.setupArena = function(gameServer) {

    while (gameServer.nodesFood.length)
        gameServer.removeNode(gameServer.nodesFood[0]);

    

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

Hunger.prototype.onPlayerSpawn = function(gameServer, player) {

    if(gameServer.disableSpawn) {

        if(!player.hasOwnProperty('splitCooldown')) {

            this.botsOnly = true;

            for(var i = 0; i < gameServer.clients.length; i++) {
                if(!gameServer.clients[i].playerTracker.hasOwnProperty('splitCooldown') && gameServer.clients[i].playerTracker.cells.length) {
                    this.botsOnly = false;
                    break;
                }
            }


            if(this.botsOnly)
                this.triggerGameEnd(gameServer);    // Insta kill of server, bc there are only bots on server

        } else
            return;

    }


    player.setColor(gameServer.getRandomColor());
    player.frozen = true;
    // Spawn player
    var spawnPlace = this.connectedPlayers >= 12 ? 0 : this.connectedPlayers;
    gameServer.spawnPlayer(player, this.aFixedPlayerPos[spawnPlace]);


    this.connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            this.connectedPlayers++;


    if(this.connectedPlayers > 1) {
        // @2. Waiting for second player to trigger actual game start
        this.startGame(gameServer);

    } else {
        // @1. 1st player (re)join server, (re)setup the arena
        this.setupArena(gameServer);

    }

};

Hunger.prototype.updateLB = function(gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    var tempLB = [];

    var players = this.connectedPlayers;

    this.balanceBots(gameServer);

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
        this.counter = this.restartInterval;
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