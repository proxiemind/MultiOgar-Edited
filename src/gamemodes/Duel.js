var TourneyEngine = require('./TourneyEngine');


function Duel() {

    TourneyEngine.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 4;
    this.name = "Duel";

    // Config
    this.matchLength = 15 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 5;              // Seconds
    this.reJoinInterval = 0;            // Minutes
    this.restartInterval = 7;           // Seconds
    this.sleepMode = 2;                 // 0 = Do nothing, 1 = Put in Sleep, 2 = Kill Server
    this.scoreMode = 0;                 // 0 = the biggest, 1 = kill/death ratio, 2 = teams
    this.mechanics = 0;                 // 0 = classic, 1 team mode mechanics, 2 experimental (not available yet)
    this.minPlayers = 2;                // Minimum number of players to trigger game start | 2 = 1v1 / 4 = 2v2 / 6 = 2v2v2 / 9 = 3v3v3

}


module.exports = Duel;
Duel.prototype = new TourneyEngine();