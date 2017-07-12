var Mode = require('./Mode');
var Entity = require('../entity');


function Duel() {

    Mode.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 4;
    this.name = "Duel";
    this.specByLeaderboard = false;
    this.packetLB = 48;

    // Gamemode Specific Variables
    this.botsOnly = true;
    this.connectedPlayers = 0;
    this.restarting = false;
    
    this.triggerOneSecond = false;
    this.tickOneSecond = 0;

    this.counter = 0;
    this.m = 0;
    this.s = 0;

    this.events = [];
    
    // Config
    this.oneSecondInterval = 25;        // GameServer.js@timerLoop:~534 | ~25 is a factor of one second within this implementation
    this.matchLength = 15;              // Minutes
    this.joinInterval = 5;              // Seconds
    this.restartInterval = 7;           // Seconds
}


module.exports = Duel;
Duel.prototype = new Mode();


// Gamemode Specific Functions

Duel.prototype.startGame = function(gameServer) {

    if(this.triggerOneSecond) {
        this.counter = this.joinInterval;
        return;
    }

    this.triggerOneSecond = true;
    this.counter = this.joinInterval;
    this.restarting = false;
    this.events.push(0);

};

Duel.prototype.triggerGameStart = function(gameServer) {

    this.counter = 0;

    gameServer.disableSpawn = true;

    for(var i = 0; i < gameServer.clients.length; i++)
        gameServer.clients[i].playerTracker.frozen = false;

    this.m = this.matchLength;

};

Duel.prototype.triggerGameEnd = function(gameServer) {

    this.m = this.s = 0;

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
    this.botsOnly = true;
    this.setupArena(gameServer);

};

Duel.prototype.setupArena = function(gameServer) {

    while(gameServer.nodesFood.length)
        gameServer.removeNode(gameServer.nodesFood[0]);

    while(gameServer.nodesEjected.length)
        gameServer.removeNode(gameServer.nodesEjected[0]);

    while(gameServer.nodesVirus.length)
        gameServer.removeNode(gameServer.nodesVirus[0]);

    // ORIGINALLY TAKEN FROM gameServer.spawnCells()
    // spawn food at random size
    var spawnCount = gameServer.config.foodMinAmount - gameServer.nodesFood.length;
    for (var i = 0; i < spawnCount; i++) {
        var cell = new Entity.Food(gameServer, null, gameServer.randomPos(), gameServer.config.foodMinSize);
        if (gameServer.config.foodMassGrow) {
            var maxGrow = gameServer.config.foodMaxSize - cell._size;
            cell.setSize(cell._size += maxGrow * Math.random());
        }
        cell.color = gameServer.getRandomColor();
        gameServer.addNode(cell);
    }

    while (gameServer.nodesVirus.length < gameServer.config.virusMinAmount) {
        var virus = new Entity.Virus(gameServer, null, gameServer.randomPos(), gameServer.config.virusMinSize);
        gameServer.addNode(virus);
    }

};

Duel.prototype.oneSecondEvents = function(gameServer) {

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

Duel.prototype.balanceBots = function(gameServer) {

    if(gameServer.disableSpawn || gameServer.config.serverBots === 0)
        return;

    this.connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            this.connectedPlayers++;

    var botsRatio = gameServer.config.serverBots - this.connectedPlayers;
    while(botsRatio !== 0) {

        if(botsRatio > 0) {

            gameServer.bots.addBot();
            botsRatio--;
            continue;

        } else {

            for(var i = 0; i < gameServer.clients.length; i++)
                if(gameServer.clients[i].playerTracker.hasOwnProperty('splitCooldown')) {

                    gameServer.clients[i].close();
                    if(++botsRatio === 0)
                        break;

                }

        }

    }

};

// Override

Duel.prototype.onPlayerSpawn = function(gameServer, player) {

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


    player.color = gameServer.getRandomColor();
    player.frozen = true;
    // Spawn player
    gameServer.spawnPlayer(player, gameServer.randomPos());


    this.connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            this.connectedPlayers++;


    if(this.connectedPlayers > 1) // Waiting for second player to trigger actual game start
        this.startGame(gameServer);


};

Duel.prototype.updateLB = function(gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    var players = this.connectedPlayers;

    this.balanceBots(gameServer);

    if(players < 2) {
        this.connectedPlayers = 0;
        for(var i = 0; i < gameServer.clients.length; i++)
            if(gameServer.clients[i].playerTracker.cells.length)
                this.connectedPlayers++;
        lb[0] = 'Awaiting Players:';
        lb[1] = this.connectedPlayers + '/' + gameServer.config.serverMaxConnections;
        return;
    }

    players = 0;
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

    for (var i = 0; i < lb.length; i++)
        lb[i] = lb[i]._name;


    if(!gameServer.disableSpawn) {
        lb.push('--------');
        lb.push('Game starting in:');
        lb.push(this.counter.toString());
        return;
    }


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

Duel.prototype.onTick = function(gameServer) {

    if(this.triggerOneSecond)
        if(this.tickOneSecond >= this.oneSecondInterval) {
            this.tickOneSecond = 0;
            this.oneSecondEvents(gameServer);

        } else {
            this.tickOneSecond++;

        }

};