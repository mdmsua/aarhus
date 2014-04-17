module.exports = Stiko;

var azure = require('azure'),
    task;

function Stiko(_task) {
    task = _task;
}

Stiko.prototype.get = function (req, res) {
    var query = azure.TableQuery.select().from('stiko');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};