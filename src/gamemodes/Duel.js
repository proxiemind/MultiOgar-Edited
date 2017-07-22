var Mode = require('./Mode');
var Entity = require('../entity');

var events = [],
    botsOnly = true,
    connectedPlayers = 0,
    restarting = false,    
    triggerOneSecond = false,
    counter = 0,
    m = 0,
    s = 0,
    matchLength = 15,// Minutes
    interval;

function Duel() {

    Mode.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 4;
    this.name = "Duel";
    this.specByLeaderboard = false;
    this.packetLB = 48;

    // Gamemode Specific Variables
    this.tickOneSecond = 0;



    // this.events = [];
    
    // Config
    // this.oneSecondInterval = 25;        // GameServer.js@timerLoop:~534 | ~25 is a factor of one second within this implementation
    this.matchLength = 15;              // Minutes
    this.joinInterval = 5;              // Seconds
    this.restartInterval = 7;           // Seconds
}


module.exports = Duel;
Duel.prototype = new Mode();


// Gamemode Specific Functions

Duel.prototype.startGame = function(gameServer) {

    if(triggerOneSecond) {
        counter = this.joinInterval;
        return;
    }

    triggerOneSecond = true;
    counter = this.joinInterval;
    restarting = false;
    events.push(0);

    clearInterval(interval);
    interval = setInterval(function(){oneSecondEvents(gameServer);}, 1000);

};

function triggerGameStart(gameServer) {

    counter = 0;

    gameServer.disableSpawn = true;

    for(var i = 0; i < gameServer.clients.length; i++)
        gameServer.clients[i].playerTracker.frozen = false;

    m = matchLength;

};

function triggerGameEnd(gameServer) {

    m = s = 0;

    for(var i = 0; i < gameServer.clients.length; i++) {

        var playerTracker = gameServer.clients[i].playerTracker;
        while(playerTracker.cells.length > 0)
            gameServer.removeNode(playerTracker.cells[0]);

    }

    gameServer.disableSpawn = false;
    triggerOneSecond = false;
    restarting = false;
    counter = 0;
    connectedPlayers = 0;
    botsOnly = true;
    setupArena(gameServer);

};

function setupArena(gameServer) {

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

    clearInterval(interval);

};

function oneSecondEvents(gameServer) {

    if (counter > 0) {
        counter--;
        return;
    }


    if (s > 0) {
        s--;
        return;
    } else if (m > 0){
        m--;
        s = 59;
        return;
    }


    if(!events.length)
        return;

    for(var i = 0; i < events.length; i++) {
        var event = events.splice(0, 1);
        if(event == 0)
            triggerGameStart(gameServer);
        else if(event == 1)
            triggerGameEnd(gameServer);
    }

};

Duel.prototype.balanceBots = function(gameServer) {

    if(gameServer.disableSpawn || gameServer.config.serverBots === 0)
        return;

    connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            connectedPlayers++;

    var botsRatio = gameServer.config.serverBots - connectedPlayers;
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

            botsOnly = true;

            for(var i = 0; i < gameServer.clients.length; i++) {
                if(!gameServer.clients[i].playerTracker.hasOwnProperty('splitCooldown') && gameServer.clients[i].playerTracker.cells.length) {
                    botsOnly = false;
                    break;
                }
            }


            if(botsOnly)
                triggerGameEnd(gameServer);    // Insta kill of server, bc there are only bots on server

        } else
            return;

    }


    player.color = gameServer.getRandomColor();
    player.frozen = true;
    // Spawn player
    gameServer.spawnPlayer(player, gameServer.randomPos());


    connectedPlayers = 0;
    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.cells.length)
            connectedPlayers++;


    if(connectedPlayers > 1) // Waiting for second player to trigger actual game start
        this.startGame(gameServer);


};

Duel.prototype.updateLB = function(gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    var players = connectedPlayers;

    this.balanceBots(gameServer);

    if(players < 2) {
        connectedPlayers = 0;
        for(var i = 0; i < gameServer.clients.length; i++)
            if(gameServer.clients[i].playerTracker.cells.length)
                connectedPlayers++;
        lb[0] = 'Awaiting Players:';
        lb[1] = connectedPlayers + '/' + gameServer.config.serverMaxConnections;
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
        lb.push(counter.toString());
        return;
    }


    // Monitor Game
    if(!restarting && (players <= 1 || !(m > 0 || s > 0))) {

        if(players > 1)
            for(var i = 0; i < gameServer.clients.length; i++)
                gameServer.clients[i].playerTracker.frozen = true;
        
        m = s = 0;
        counter = this.restartInterval;
        restarting = true;
        events.push(1);

    }


    if(players == 1 || restarting) {
        lb[1] = '--------';
        lb[2] = 'WINS!';
        lb[3] = 'Restart in:';
        lb[4] = counter.toString(); 
        return;
    }

    lb.push('--------');
    lb.push('Time Limit:');
    lb.push(m + ':' + (s < 10 ? '0': '') + s);

};
/*
Duel.prototype.onTick = function(gameServer) {

    if(triggerOneSecond)
        if(this.tickOneSecond >= this.oneSecondInterval) {
            this.tickOneSecond = 0;
            this.oneSecondEvents(gameServer);

        } else {
            this.tickOneSecond++;

        }

};
*/

Duel.prototype.onServerInit = function (gameServer) {

    matchLength = this.matchLength;

};