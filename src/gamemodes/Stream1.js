var TourneyEngine = require('./TourneyEngine');


function Stream1() {

    TourneyEngine.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 8;
    this.name = "Stream1";

    // Config
    this.scoreMode = 1;                 // 0 = the biggest, 1 = kill/death ratio
    this.hideNicknames = 1;             // 0 = Show, 1 = Hide
    this.matchLength = 15 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 1;              // Seconds
    this.reJoinInterval = 14.9;         // Minutes
    this.restartInterval = 5;           // Seconds

}


module.exports = Stream1;
Stream1.prototype = new TourneyEngine();