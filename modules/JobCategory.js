var Q = require('Q'),
    azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = JobCategory;

function JobCategory(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'job-category', 'kode', callback);
}

JobCategory.prototype.install = function (callback) {
    var setup = new Import('jobCategory.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var jobCategories = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(jobCategories, callback);
    });
};

JobCategory.prototype.all = function (callback) {
    var deferred = Q.defer();
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'job-category');
    task.queryEntities(query, function (error, entities) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

JobCategory.prototype.one = function (jobCategory, callback) {
    var deferred = Q.defer();
    task.queryEntity(jobCategory, function (error, entity) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entity);
    });
    return deferred.promise.nodeify(callback);
};
