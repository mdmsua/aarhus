var azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Activitet;

function Activitet(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'aktivitet', 'kode', callback);
}

Activitet.prototype.install = function(callback) {
    var setup = new Import('aktivitet.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error); return;
        }
        var aktivitets = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(aktivitets, callback);
    });
};

Activitet.prototype.all = function (callback) {
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'aktivitet');
    task.queryEntities(query, function (error, entities) {
        callback(error, entities);
    });
};
