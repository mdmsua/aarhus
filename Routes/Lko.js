module.exports = Lko;

var azure = require('azure'),
    task;

function Lko(_task) {
    task = _task;
}

Lko.prototype.get = function (req, res) {
    var query = azure.TableQuery.select().from('lko');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};