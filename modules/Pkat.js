var Q = require('Q'),
    azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Pkat;

function Pkat(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'pkat', 'kode', callback);
}

Pkat.prototype.install = function (callback) {
    var setup = new Import('pkat.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var pkats = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(pkats, callback);
    });
};

Pkat.prototype.all = function (callback) {
    var deferred = Q.defer();
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'pkat');
    task.queryEntities(query, function (error, entities) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

Pkat.prototype.one = function (pkat, callback) {
    var deferred = Q.defer();
    task.queryEntity(pkat, function (error, entity) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entity);
    });
    return deferred.promise.nodeify(callback);
};
