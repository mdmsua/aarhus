var Lko = require('../modules/Lko'),
    Pkat = require('../modules/Pkat'),
    Sted = require('../modules/Sted'),
    Stiko = require('../modules/Stiko');

module.exports = Api;

function Api(tableService) {
    lko = new Lko(tableService);
    pkat = new Pkat(tableService);
    sted = new Sted(tableService);
    stiko = new Stiko(tableService);
}

Api.prototype.lko = function (req, res) {
    lko.all(function (error, entities) {
        if (error)
            res.send(200, error);
        else
            res.send(entities);
    });
};

Api.prototype.pkat = function (req, res) {
    pkat.all(function (error, entities) {
        if (error)
            res.send(200, error);
        else
            res.send(entities);
    });
};

Api.prototype.sted = function (req, res) {
    sted.all(function (error, entities) {
        if (error)
            res.send(200, error);
        else
            res.send(entities);
    });
};

Api.prototype.stiko = function (req, res) {
    stiko.all(function (error, entities) {
        if (error)
            res.send(200, error);
        else
            res.send(entities);
    });
};