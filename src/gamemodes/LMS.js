var TourneyEngine = require('./TourneyEngine');


function LMS() {

    TourneyEngine.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 6;
    this.name = "LMS";
    // this.specByLeaderboard = false;
    // this.packetLB = 48;

    // Config
    this.matchLength = 60 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 20;             // Seconds
    this.restartInterval = 10;           // Seconds
}


module.exports = LMS;
LMS.prototype = new TourneyEngine();