module.exports = {
    Mode: require('./Mode'),
    FFA: require('./FFA'),
    Teams: require('./Teams'),
    Experimental: require('./Experimental'),
    TourneyEngine: require('./TourneyEngine'),
    Duel: require('./Duel'),
    Hunger: require('./Hunger'),
    LMS: require('./LMS')
};

var get = function (id) {
    var mode;
    switch (parseInt(id)) {
        case 1: // Teams
            mode = new module.exports.Teams();
            break;
        case 2: // Experimental
            mode = new module.exports.Experimental();
            break;
        case 3: // TourneyEngine
            mode = new module.exports.TourneyEngine();
            break;
        case 4: // Duel
            mode = new module.exports.Duel();
            break;
        case 5: // Hunger Games
            mode = new module.exports.Hunger();
            break;
        case 6: // LMS
            mode = new module.exports.LMS();
            break;
        default: // FFA is default
            mode = new module.exports.FFA();
            break;
    }
    return mode;
};

module.exports.get = get;
