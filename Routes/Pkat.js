module.exports = Pkat;

var azure = require('azure'),
    task;

function Pkat(_task) {
    task = _task;
}

Pkat.prototype.get = function (req, res) {
    var query = azure.TableQuery.select().from('pkat');
    task.queryEntities(query, function (error, entities) {
        if (error)
            res.send(400, error);
        res.send(entities);
    });
};