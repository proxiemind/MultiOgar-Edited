var Mode = require('./Mode');
var Entity = require('../entity');

function Teams() {
    Mode.apply(this, Array.prototype.slice.call(arguments));
    
    this.ID = 1;
    this.name = "Teams";
    this.decayMod = 1.5;
    this.packetLB = 50;
    this.haveTeams = true;
    this.colorFuzziness = 32;
    
    // Special
    this.teamAmount = 5; // Amount of teams. Having more than 3 teams will cause the leaderboard to work incorrectly (client issue).
    this.colors = [{
            'r': 223,
            'g': 0,
            'b': 0
        }, {
            'r': 0,
            'g': 223,
            'b': 0
        }, {
            'r': 0,
            'g': 0,
            'b': 223
        }, {
            'r': 140,
            'g': 50,
            'b': 223
        }, {
            'r': 223,
            'g': 223,
            'b': 0
        }]; // Make sure you add extra colors here if you wish to increase the team amount [Default colors are: Red, Green, Blue]
    this.nodes = []; // Teams cells
    this.teamPlayers = [];
    this.nextPlayerTeam = 0;

}

module.exports = Teams;
Teams.prototype = new Mode();

//Gamemode Specific Functions

Teams.prototype.fuzzColorComponent = function (component) {
    component += Math.random() * this.colorFuzziness >> 0;
    return component;
};

Teams.prototype.getTeamColor = function (team) {
    var color = this.colors[team];
    return {
        r: this.fuzzColorComponent(color.r),
        b: this.fuzzColorComponent(color.b),
        g: this.fuzzColorComponent(color.g)
    };
};

// Override

Teams.prototype.onPlayerSpawn = function (gameServer, player) {
    // Random color based on team
    player.color = this.getTeamColor(player.team);
    // Spawn player
    gameServer.spawnPlayer(player, gameServer.randomPos());
};

Teams.prototype.onServerInit = function (gameServer) {
    // Set up teams
    for (var i = 0; i < this.teamAmount; i++) {
        this.nodes[i] = [];
        this.teamPlayers[i] = 0;
    }
    
    // migrate current players to team mode
    for (var i = 0; i < gameServer.clients.length; i++) {
        var client = gameServer.clients[i].playerTracker;
        this.onPlayerInit(gameServer, client);
        client.color = this.getTeamColor(client.team);
        for (var j = 0; j < client.cells.length; j++) {
            var cell = client.cells[j];
            cell.color = client.color;
            this.nodes[client.team].push(cell);
        }
    }

    // Virus is not giving any mass in Team Mode
    Entity.Cell.prototype.onEat = function (prey) {
        if (!this.gameServer.config.playerBotGrow) {
            if (this._size >= 250 && prey._size <= 41 && prey.cellType == 0)
                prey.radius = 0; // Can't grow from players under 17 mass
        }
        if(prey.cellType !== 2)
            this.setSize(Math.sqrt(this.radius + prey.radius));
    };

};

Teams.prototype.onPlayerInit = function (gameServer, player) {
    // Get (not so random anymore) team

    var pickRandom = ~~(Math.random() * this.teamAmount);

    // First, exclude from spawning in to dominating team
    var massTotal = 0;
    for(var i = 0; i < this.teamAmount; i++) {
        massTotal += gameServer.leaderboard[i];
    }
    var excluded = gameServer.leaderboard[pickRandom] > massTotal / 2 ? 1 : 0;

    // Follow next selection or not, 1 / 20 chance
    if(~~(Math.random() * 20) === 19) {

        player.team = excluded ? (pickRandom + 1 > this.teamAmount ? pickRandom-- : pickRandom++) : pickRandom;
        this.teamPlayers[player.team]++;
        return;

    }

    // Next Selection is simply assign player in order, when team is not dominating
    var i = this.nextPlayerTeam;
    this.nextPlayerTeam = gameServer.leaderboard[i] > massTotal / 2 ? (i + 1 >= this.teamAmount ? i-1 : i+1) : i;
    player.team = this.nextPlayerTeam;
    if(++this.nextPlayerTeam >= this.teamAmount)
        this.nextPlayerTeam = 0

    
};

Teams.prototype.onCellAdd = function (cell) {
    // Add to team list
    this.nodes[cell.owner.team].push(cell);
};

Teams.prototype.onCellRemove = function (cell) {
    // Remove from team list
    var index = this.nodes[cell.owner.team].indexOf(cell);
    if (index != -1) {
        this.nodes[cell.owner.team].splice(index, 1);
    }
};
/*
Teams.prototype.onCellMove = function (cell, gameServer) {
    // Find team
    for (var i = 0; i < cell.owner.visibleNodes.length; i++) {
        // Only collide with player cells
        var check = cell.owner.visibleNodes[i];
        
        if ((check.cellType != 0) || (cell.owner == check.owner)) {
            continue;
        }
        
        // Collision with teammates
        var team = cell.owner.team;
        if (check.owner.team == team) {
            var manifold = gameServer.checkCellCollision(cell, check); // Calculation info
            if (manifold != null) { // Collided
                // Cant eat team members
                !manifold.cell2.canEat(manifold.cell1);
            }
        }
    }
};
*/
Teams.prototype.updateLB = function (gameServer) {
    gameServer.leaderboardType = this.packetLB;
    var total = 0;
    var teamMass = [];
    // Get mass
    for (var i = 0; i < this.teamAmount; i++) {
        // Set starting mass
        teamMass[i] = 0;
        
        // Loop through cells
        for (var j = 0; j < this.nodes[i].length; j++) {
            var cell = this.nodes[i][j];
            if (!cell) continue;
            teamMass[i] += cell._mass;
            total += cell._mass;
        }
    }
    // No players
    if (total <= 0) {
        for (var i = 0; i < this.teamAmount; i++) {
            gameServer.leaderboard[i] = 0;
        }
        return;
    }
    // Calc percentage
    for (var i = 0; i < this.teamAmount; i++) {
        gameServer.leaderboard[i] = teamMass[i] / total;
    }
};
