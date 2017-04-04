var Mode = require('./Mode');
var Vec2 = require('../modules/Vec2');
var Entity = require('../entity');


var nextPos = 0;
var counter = 9;
var m=1, s=59;
var restarting = false;


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
    this.sgTimeoutHolder;
    this.cTimeoutHolder;

    // Config

}


module.exports = Hunger;
Hunger.prototype = new Mode();


// Gamemode Specific Functions

// Override


//@setTimeout
Hunger.prototype.startGame = function (gameServer) {

    clearTimeout(this.sgTimeoutHolder);

    counter = 15;
    counting();
    restarting = false;

    this.sgTimeoutHolder = setTimeout(function(){

        gameServer.disableSpawn = true; // Players are not allowed to (re)spawn when game is running, Last Man Standing game type, they can spectate though

        for(var i = 0; i < gameServer.clients.length; i++)
            gameServer.clients[i].playerTracker.frozen = false;

        m = 19; s=59;
        timeLimit();
        checkGame(gameServer, 10000);

    }, (counter+1) * 1000);

};

//@setTimeout
function checkGame(gameServer, delay) {

    setTimeout(function(){

        var alive = 0;
        delay = 1500;

        for(var i = 0; i < gameServer.clients.length; i++)
            if(gameServer.clients[i].playerTracker.cells.length)
                if(++alive > 2) {
                    delay += 1500;
                }

        if(alive > 1 && m >= 0 && s >= 0) {
            checkGame(gameServer, delay);
            return;
        }

        if(alive > 1)
            for(var i = 0; i < gameServer.clients.length; i++)
                gameServer.clients[i].playerTracker.frozen = true;
        
        counter = 5;
        counting();
        restarting = true;

        setTimeout(function(){

            gameServer.disableSpawn = false;

            nextPos = 0;

            var count = 0;
            for (var i = 0; i < gameServer.clients.length; i++) {
                var playerTracker = gameServer.clients[i].playerTracker;
                while (playerTracker.cells.length > 0) {
                    gameServer.removeNode(playerTracker.cells[0]);
                    count++;
                }
            }

        }, (counter+1) * 1000);

    }, delay);

}

//@setTimeout
function counting() {

    clearTimeout(this.cTimeoutHolder);

    this.cTimeoutHolder = setTimeout(function(){

        if(--counter > 0)
            counting();

    }, 1000);

}

//@setTimeout
function timeLimit() {

    setTimeout(function(){

        if (s-- > 0) {
            timeLimit();
        } else if (m-- > 0){
            s = 59;
            timeLimit();
        }

    }, 1000);

}


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


Hunger.prototype.onPlayerSpawn = function (gameServer, player) {

    if(gameServer.disableSpawn)
        return;


    player.setColor(gameServer.getRandomColor());
    player.frozen = true;
    // Spawn player
    gameServer.spawnPlayer(player, this.aFixedPlayerPos[nextPos]);
        nextPos++;


    this.connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            this.connectedPlayers++;
                // break; // No point to check further, (+)2 players already there


    if(this.connectedPlayers > 1) {
        // @2. Waiting for second player to trigger actual game start (each next player will delay server start for 15 seconds - max players 12)

        this.startGame(gameServer);

    } else {
        // @1. 1st player joins server, (re)setup the arena

        this.setupArena(gameServer);

    }

};


Hunger.prototype.updateLB = function (gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    var tempLB = [];

    var players = this.connectedPlayers;
        lb[0] = 'Awaiting Players:';
        lb[1] = players + '/' + gameServer.config.serverMaxConnections;

    if(this.connectedPlayers < 2) {
        lb[2] = 'Required to start';
        lb[3] = '2';
        return;
    }

    if(!gameServer.disableSpawn) {
        lb[2] = 'Game starting in:';
        lb[3] = counter.toString();
        return;
    }

    var players = 0;
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
    // this.rankOne = lb[0];

    if(players == 1 || restarting) {
        lb[0] = potentialWinner;
        lb[1] = 'WINS!';
        lb[2] = (players > 1 && restarting ? 'Left Total: ' + players : 'Flowless Victory!');
        lb[3] = 'Restart in:';
        lb[4] = counter.toString(); 
        return;
    }

    lb[0] = 'Players Remaining:';
    lb[1] = players + '/' + gameServer.config.serverMaxConnections;
    lb[2] = 'Time Limit:';
    lb[3] = m + ':' + s;

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