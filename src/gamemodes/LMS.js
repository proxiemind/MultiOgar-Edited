var Duel = require('./Duel');
var Entity = require('../entity');


function LMS() {

    Duel.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 6;
    this.name = "LMS";
    this.specByLeaderboard = false;
    this.packetLB = 48;

    // Config
    this.matchLength = 60;              // Minutes
    this.joinInterval = 20;             // Seconds
    this.restartInterval = 10;           // Seconds
}


module.exports = LMS;
LMS.prototype = new Duel();