"use strict";

var Q = require('Q'),
    uuid = require('node-uuid'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import");

function JobCategoryConfig(tableService, callback) {
    this.task = new Task(tableService, 'jobCategoryConfig', 'job-category-config', 'uuid', callback);
}

JobCategoryConfig.prototype.install = function (callback) {
    var self = this,
        setup = new Import('jobCategoryConfig.txt');
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
        self.task.batchEntities(jobCategoryConfigs, callback);
    });
};

JobCategoryConfig.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ?
                { table: 'jobCategoryConfig' } :
                require('azure').TableQuery.select().from('jobCategoryConfig');
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

JobCategoryConfig.prototype.one = function (uuid, callback) {
    var deferred = Q.defer();
    this.task.queryEntity(uuid, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entity);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = JobCategoryConfig;