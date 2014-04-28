var azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Sted;

function Sted(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'sted', 'kode', callback);
}

Sted.prototype.install = function(callback) {
    var setup = new Import('sted.txt');
    setup.getLines(function (error, lines) {
        if (error) {
            callback(error); return;
        }
        var steds = lines.map(function (line) {
            return {
                kode: (line[0] || '').toString().trim(),
                navn: (line[1] || '').trim()
            };
        });
        task.batchEntities(steds, callback);
    });
};

Sted.prototype.all = function (callback) {
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'sted');
    task.queryEntities(query, function (error, entities) {
        callback(error, entities);
    });
};
