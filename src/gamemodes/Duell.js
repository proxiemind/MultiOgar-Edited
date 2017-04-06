var Mode = require('./Mode');
// var Vec2 = require('../modules/Vec2');
// var Entity = require('../entity');
// var Logger = require('../modules/Logger');




function Duell() {

    Mode.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 5;
    this.name = "Duell";
    this.specByLeaderboard = true;
    this.packetLB = 48;

    // Gamemode Specific Variables
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
    this.matchLength = 10;           // Minutes

}


module.exports = Duell;
Duell.prototype = new Mode();


// Gamemode Specific Functions

// Override


Duell.prototype.startGame = function(gameServer) {

    this.triggerOneSecond = true;
    this.counter = 10;
    this.restarting = false;
    this.events.push(0);

};


Duell.prototype.triggerGameStart = function(gameServer) {


    // Logger.warn('YEAP, IT WILL WORK');
    gameServer.disableSpawn = true;

    for(var i = 0; i < gameServer.clients.length; i++)
        gameServer.clients[i].playerTracker.frozen = false;

    this.m = this.matchLength;


};


Duell.prototype.triggerGameEnd = function(gameServer) {

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


Duell.prototype.setupArena = function(gameServer) {

    while (gameServer.nodesEjected.length)
        gameServer.removeNode(gameServer.nodesEjected[0]);

    while(gameServer.nodesVirus.length)
        gameServer.removeNode(gameServer.nodesVirus[0]);

};


Duell.prototype.onPlayerSpawn = function(gameServer, player) {

    if(gameServer.disableSpawn)
        return;


    player.setColor(gameServer.getRandomColor());
    player.frozen = true;
    // Spawn player
    gameServer.spawnPlayer(player, gameServer.randomPos());


    this.connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            this.connectedPlayers++;
                // break; // No point to check further, (+)2 players already there


    if (this.connectedPlayers > 1) {
        // @2. Waiting for second player to trigger actual game start
        this.startGame(gameServer);

    } else {
        // @1. 1st player (re)join server, (re)setup the arena

        this.setupArena(gameServer);

    }


};


Duell.prototype.updateLB = function(gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    var players = this.connectedPlayers;

    if(players < 2) {
        lb[0] = 'Awaiting Players:';
        lb[1] = players + '/' + gameServer.config.serverMaxConnections;
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
            if (lb[j]._score < player._score) break;

        lb.splice(j, 0, player);
        pos++;
    }
    this.rankOne = lb[0];

    for (var i = 0; i < lb.length; i++)
        lb[i] = lb[i]._name;


    if(!gameServer.disableSpawn) {
        lb.push('--------');
        lb.push('Game starting in:');
        lb.push(this.counter.toString());
        return;
    }


    // Monitor Game
    if(!this.restarting && (players == 1 || !(this.m > 0 || this.s > 0))) {

        // Logger.warn('TRIGGER END GAME');

        if(players > 1)
            for(var i = 0; i < gameServer.clients.length; i++)
                gameServer.clients[i].playerTracker.frozen = true;
        
        this.m = this.s = 0;
        this.counter = 5;
        this.restarting = true;
        this.events.push(1);

    }


    if(players == 1 || this.restarting) {
        lb[1] = '--------';
        lb[2] = 'WINS!';
        lb[3] = 'Restart in:';
        lb[4] = this.counter.toString(); 
        return;
    }

    lb.push('--------');
    lb.push('Time Limit:');
    lb.push(this.m + ':' + (this.s < 10 ? '0': '') + this.s);   

};


Duell.prototype.onTick = function(gameServer) {

    if(this.triggerOneSecond)
        if(this.tickOneSecond >= this.oneSecondInterval) {
            // Logger.warn('onTick');
            this.tickOneSecond = 0;
            this.oneSecondEvents(gameServer);

        } else {
            this.tickOneSecond++;

        }


};


Duell.prototype.oneSecondEvents = function(gameServer) {

    if (this.counter > 0) {
        this.counter--;
        // Logger.warn('COUNTER');
        return;
    }


    if (this.s > 0) {
        // Logger.warn('TIME');
        this.s--;
        return;
    } else if (this.m > 0){
        this.m--;
        this.s = 59;
        return;
    }


    for(var i = 0; i < this.events.length; i++) {
        // Logger.warn('TRIGGER AND REMOVE EVENT');
        // this.events[0];
        var event = this.events.splice(0, 1);
        if(event == 0)
            this.triggerGameStart(gameServer);
        else if(event == 1)
            this.triggerGameEnd(gameServer);
    }

};