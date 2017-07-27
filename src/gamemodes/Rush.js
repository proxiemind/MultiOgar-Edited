var TourneyEngine = require('./TourneyEngine');


function Rush() {

    TourneyEngine.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 7;
    this.name = "Rush";

    // Config
    this.matchLength = 10 * 60;         // Minutes (Do not remove " * 60" seconds)
    this.joinInterval = 5;              // Seconds
    this.reJoinInterval = 9.9;          // Minutes
    this.restartInterval = 5;           // Seconds

}


module.exports = Rush;
Rush.prototype = new TourneyEngine();