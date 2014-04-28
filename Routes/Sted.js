module.exports = Sted;

var azure = require('azure'),
    task;

function Sted(_task) {
    task = _task;
}

Sted.prototype.get = function (req, res) {
    var query = azure.TableQuery.select().from('sted');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};