module.exports = Api;

var Task = require('../modules/Task'),
    moment = require('moment'),
    azure = require('azure');

function Api(ts) {
    tableService = ts;
}

Api.prototype.lko = function (req, res, nxt) {
    var task = new Task(tableService, 'lko', 'lko');
    var query = azure.TableQuery.select().from('lko');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};

Api.prototype.pkat = function (req, res, nxt) {
    var task = new Task(tableService, 'pkat', 'pkat');
    var query = azure.TableQuery.select().from('pkat');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};

Api.prototype.stiko = function (req, res, nxt) {
    var task = new Task(tableService, 'stiko', 'stiko');
    var query = azure.TableQuery.select().from('stiko');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};

Api.prototype.history = function (req, res) {
    var data = [],
        dates = [],
        lkos = [],
        pkats = [],
        stikos = [],
        length = 12;
    for (var i = 0; i < length; i++) {
        dates.push(Number(new Date(Number((Math.random() * 1e12 + 1e11).toFixed()))));
    }
    dates.sort();
    for (var i = 0; i < length; i++) {
        data.push({
            period: moment(new Date(dates[i])).format("MMMM YYYY") + ' - ' + moment(i === (length - 1) ? new Date() : new Date(dates[i + 1])).format("MMMM YYYY")
        });
    }
    res.send(data.reverse());
};