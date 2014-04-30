var Q = require('Q'),
    azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Sted;

function Sted(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'sted', 'kode', callback);
}

Sted.prototype.install = function (callback) {
    var setup = new Import('sted.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var steds = words.map(function (word) {
            return {
                kode: (word[0] || '').toString().trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(steds, callback);
    });
};

Sted.prototype.all = function (callback) {
    var deferred = Q.defer();
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'sted');
    task.queryEntities(query, function (error, entities) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

Sted.prototype.one = function (sted, callback) {
    var deferred = Q.defer();
    task.queryEntity(sted, function (error, entity) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entity);
    });
    return deferred.promise.nodeify(callback);
};
