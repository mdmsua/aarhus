var azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Enhed;

function Enhed(tableService, callback) {
    task = new Task(tableService, 'enhed', 'enhed', 'kode', callback);
}

Enhed.prototype.install = function (callback) {
    var setup = new Import('enhed.txt');
    setup.getWords('\t', function (error, words) {
            if (error) {
                callback(error);
                return;
            }
            var enheds = words.map(function (word) {
                var entity = {
                    kode: (word[0] || '').trim(),
                    navn: (word[2] || '').trim(),
                    parent: Number((word[1] || '').trim())
                };
                if ((word[3] || '').trim())
                    entity.location = Number(word[3].trim());
                return entity;
            });
            task.batchEntities(enheds, callback);
        }
    );
};

Enhed.prototype.all = function (callback) {
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'enhed');
    task.queryEntities(query, function (error, entities) {
        callback(error, entities);
    });
};
