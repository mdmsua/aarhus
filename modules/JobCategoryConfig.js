"use strict";

var Q = require("Q"),
    uuid = require("node-uuid"),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    table = "jobCategoryConfig";

function JobCategoryConfig(tableService, callback) {
    this.task = new Task(tableService, table, "job-category-config", "uuid", callback);
}

JobCategoryConfig.prototype.install = function (callback) {
    var self = this,
        setup = new Import(table + ".txt");
    setup.getWords("\t", function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var jobCategoryConfigs = words.map(function (word) {
            return {
                stilling: (word[0] || "").trim(),
                stiko: Number((word[1] || "").trim()),
                pkat: Number((word[2] || "").trim()),
                st: Number((word[3] || "").trim()),
                lko: Number((word[4] || "").trim()),
                description: (word[5] || "").trim(),
                sats: Number((word[6] || "").trim()),
                uuid: uuid.v4()
            };
        });
        self.task.batchEntities(jobCategoryConfigs, callback);
    });
};

JobCategoryConfig.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table } :
                require("azure").TableQuery.select().from(table);
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

JobCategoryConfig.prototype.top = function (count, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, top: count } :
                require("azure").TableQuery.select().from(table).top(count);
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

JobCategoryConfig.prototype.getByJobPosition = function (position, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { st: position } } :
                require("azure").TableQuery.select().from(table).where("st eq ?", position);
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = JobCategoryConfig;