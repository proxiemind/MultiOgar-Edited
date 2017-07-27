var TourneyEngine = require('./TourneyEngine');


function Duel() {

    TourneyEngine.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 4;
    this.name = "Duel";
    // this.specByLeaderboard = false;
    // this.packetLB = 48;

    // Config
    this.matchLength = 15 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 5;              // Seconds
    this.reJoinInterval = 0;            // Minutes
    this.restartInterval = 7;           // Seconds

}


module.exports = Duel;
Duel.prototype = new TourneyEngine();