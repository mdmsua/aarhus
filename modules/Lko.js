var azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Lko;

function Lko(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'lko', 'kode', callback);
}

Lko.prototype.install = function(callback) {
    var setup = new Import('lko.txt');
    setup.getWords(function (error, words) {
        if (error) {
            callback(error); return;
        }
        var lkos = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(lkos, callback);
    });
};

Lko.prototype.all = function (callback) {
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'lko');
    task.queryEntities(query, function (error, entities) {
        callback(error, entities);
    });
};
