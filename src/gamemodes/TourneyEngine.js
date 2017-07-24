var Mode = require('./Mode');
var Entity = require('../entity');
var Logger = require('../modules/Logger');


function TourneyEngine() {

    Mode.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 3;
    this.name = "TourneyEngine - Do not use directly!";
    this.specByLeaderboard = false;
    this.packetLB = 48;

    // Engine Specific Variables
    this.stage = 0;                     // 0 = waiting for players / IDLE, 1 = trigger game start, 2 = game is running, 3 = trigger game end
    this.alivePlayers = [];
    this.timer;
    
    // Local Config
    this.matchLength = 15 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 5;              // Seconds
    this.restartInterval = 7;           // Seconds
}


module.exports = TourneyEngine;
TourneyEngine.prototype = new Mode();


// Tourney Engine Specific Functions

TourneyEngine.prototype.startGame = function(gameServer) {

    if(this.timer) {
        this.timer = this.joinInterval;
        return;
    }

    this.stage = 1;
    this.timer = this.joinInterval;

};

TourneyEngine.prototype.onStartGame = function(gameServer) {

    this.stage = 2;
    this.timer = this.matchLength;
    gameServer.disableSpawn = true;

    for(var i = 0; i < this.alivePlayers.length; i++)
        this.alivePlayers[i].frozen = false;


};

TourneyEngine.prototype.endGame = function() {

    this.stage = 3;
    this.timer = this.restartInterval;
    var players = this.alivePlayers;

    if(players.length > 1)
        for(var i = 0; i < players.length; i++)
            players[i].frozen = true;

};

TourneyEngine.prototype.onEndGame = function(gameServer) {

    var alive = [],
        players = this.alivePlayers;

    while(players.length > 0) { // onCellRemove is making sure to keep track on alivePlayers

        var playerTracker = players[0];
        alive.push(playerTracker._name + ':' + playerTracker._score);
        while(playerTracker.cells.length > 0)
            gameServer.removeNode(playerTracker.cells[0]);

    }

    Logger.info('Game just Ended - alive players: ' + alive.join('|'));

    gameServer.disableSpawn = false;
    this.reSetupArena(gameServer);
    this.alivePlayers = [];
    this.timer = 0;
    this.stage = 0;

};

TourneyEngine.prototype.reSetupArena = function(gameServer) {

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

TourneyEngine.prototype.formatTimer = function() {
    
    if (this.timer <= 0)
        return "0:00";

    // Format
    var min = Math.floor(this.timer / 60);
    var sec = this.timer % 60;
    sec = (sec > 9) ? sec : "0" + sec.toString();
    return min + ":" + sec;

};

// Override

TourneyEngine.prototype.onServerInit = function(gameServer) {

    this.reSetupArena(gameServer);
    gameServer.run = false; // Put all in sleep mode/IDLE, but listen for WebSocket connections
 
};

TourneyEngine.prototype.onPlayerInit = function(gameServer, player) {

    gameServer.run = true; // Reawake server

};

TourneyEngine.prototype.onPlayerDC = function(gameServer) {

    for(var i = 0; i < gameServer.clients.length; i++)
        if(gameServer.clients[i].playerTracker.socket.isConnected)
            return;

    setTimeout(function(){
            gameServer.run = false; // Put all in sleep mode/IDLE, but listen for WebSocket connections
            Logger.warn('Putting Server in Sleep Mode');
        },
        (this.stage > 0 ? (this.joinInterval + this.restartInterval) * 1000 : 0) // To ensure server will not stuck in the middle of restarting or something
    );

};

TourneyEngine.prototype.onCellRemove = function(cell) {

    var owner = cell.owner;
    if(owner.cells.length)
        return;

    // RIP Player
    var index = this.alivePlayers.indexOf(owner);
    if(index !== -1)
        this.alivePlayers.splice(index, 1);

    // Bot - kick them, it creates damn performance drops - need to check it later why
    if(owner.hasOwnProperty('splitCooldown')) {
        owner.isRemoved = true;
        owner.isCloseRequested = true;
    }

    // Monitor Alive Players & end game if conditions apply
    if(this.alivePlayers.length <= 1 && this.stage == 2) {
        this.endGame();
    } else if(this.alivePlayers.length <= 1 && this.stage < 2) {
        this.timer = 0;
        this.stage = 0;
    }

};

TourneyEngine.prototype.onPlayerSpawn = function(gameServer, player) {

    if(gameServer.disableSpawn)
            return;

    player.color = gameServer.getRandomColor();
    player.frozen = true;
    // Spawn player
    gameServer.spawnPlayer(player, gameServer.randomPos());


    this.alivePlayers.push(player);


    if(this.alivePlayers.length > 1) // Waiting for second player to trigger actual game start
        this.startGame(gameServer);


};

TourneyEngine.prototype.sortLB = function(lb) {

    var players = this.alivePlayers;
    for(var i = 0, pos = 0; i < players.length; i++) {

        var player = players[i];
        if (player.isRemoved || !player.cells.length || player.socket.isConnected == false || player.isMi)
            continue;

        for(var j = 0; j < pos; j++)
            if (lb[j]._score < player._score) break;

        lb.splice(j, 0, player);
        pos++;

    }

    for (var i = 0; i < lb.length; i++)
        lb[i] = lb[i]._name;

};

TourneyEngine.prototype.updateLB = function(gameServer, lb) {

    gameServer.leaderboardType = this.packetLB;

    switch(this.stage) {
        case 2: // Game is running
            this.sortLB(lb);
            lb.push('--------');
            lb.push('Time Limit:');
            lb.push(this.formatTimer());
            if(this.timer-- <= 0)
                this.endGame(gameServer);
            break;
        case 3: // Trigger game end
            this.sortLB(lb);
            lb[1] = '--------';
            lb[2] = 'WINS!';
            lb[3] = 'Restart in:';
            lb[4] = this.timer.toString();
            if(this.timer-- <= 0)
                this.onEndGame(gameServer);
            break;
        case 1: // Trigger game start
            this.sortLB(lb);
            lb.push('--------');
            lb.push('Game starting in:');
            lb.push(this.timer.toString());
            if(this.timer-- <= 0)
                this.onStartGame(gameServer);
            break;
        default: // Case 0: IDLE game stage or 1 player is waiting
            lb[0] = 'Awaiting Players:';
            lb[1] = this.alivePlayers.length + '/' + gameServer.config.serverMaxConnections;
            break;
    }

};