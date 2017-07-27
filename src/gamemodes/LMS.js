var TourneyEngine = require('./TourneyEngine');


function LMS() {

    TourneyEngine.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 6;
    this.name = "LMS";
    // this.specByLeaderboard = false;
    // this.packetLB = 48;

    // Config
    this.matchLength = 45 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 5;              // Seconds
    this.reJoinInterval = 5;            // Minutes
    this.restartInterval = 7;           // Seconds

}


module.exports = LMS;
LMS.prototype = new TourneyEngine();