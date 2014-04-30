var Q = require('Q'),
    azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Stiko;

function Stiko(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'stiko', 'kode', callback);
}

Stiko.prototype.install = function (callback) {
    var setup = new Import('stiko.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var stikos = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(stikos, callback);
    });
};

Stiko.prototype.all = function (callback) {
    var deferred = Q.defer();
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'stiko');
    task.queryEntities(query, function (error, entities) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

Stiko.prototype.one = function (stiko, callback) {
    var deferred = Q.defer();
    task.queryEntity(stiko, function (error, entity) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entity);
    });
    return deferred.promise.nodeify(callback);
};