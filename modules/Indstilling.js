"use strict";

var Q = require("Q"),
    _ = require("underscore"),
    uuid = require("node-uuid"),
    Task = require("../modules/Task"),
    tableName = "indstilling";

function Indstilling(tableService) {
    this.task = new Task(tableService, tableName);
}

Indstilling.prototype.get = function (ssn, role, callback) {
    var d = Q.defer();
    this.task.getEntity(ssn, role, function (error, entity) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(entity);
        }
    });
    return d.promise.nodeify(callback);
};

Indstilling.prototype.save = function (ssn, role, entity, callback) {
    var d = Q.defer();
    entity.PartitionKey = ssn;
    entity.RowKey = role;
    this.task.insertOrReplaceEntity(entity, function (error, entity) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(entity);
        }
    });
    return d.promise.nodeify(callback);
};

module.exports = Indstilling;