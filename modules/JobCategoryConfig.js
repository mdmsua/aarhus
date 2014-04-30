var Q = require('Q'),
    azure = require('azure'),
    uuid = require('node-uuid'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = JobCategoryConfig;

function JobCategoryConfig(tableService, callback) {
    task = new Task(tableService, 'jobCategoryConfig', 'job-category-config', 'uuid', callback);
}

JobCategoryConfig.prototype.install = function (callback) {
    var setup = new Import('jobCategoryConfig.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var jobCategoryConfigs = words.map(function (word) {
            return {
                stilling: (word[0] || '').trim(),
                stiko: Number((word[1] || '').trim()),
                pkat: Number((word[2] || '').trim()),
                st: Number((word[3] || '').trim()),
                lko: Number((word[4] || '').trim()),
                description: (word[5] || '').trim(),
                sats: Number((word[6] || '').trim()),
                uuid: uuid.v4()
            };
        });
        task.batchEntities(jobCategoryConfigs, callback);
    });
};

JobCategoryConfig.prototype.all = function (callback) {
    var deferred = Q.defer();
    var query = azure.TableQuery.select().from('jobCategoryConfig');
    task.queryEntities(query, function (error, entities) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

JobCategoryConfig.prototype.one = function (uuid, callback) {
    var deferred = Q.defer();
    task.queryEntity(uuid, function (error, entity) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entity);
    });
    return deferred.promise.nodeify(callback);
};
