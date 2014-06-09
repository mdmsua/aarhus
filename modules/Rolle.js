"use strict";

var Task = require("../modules/Task"),
    Q = require("Q"),
    util = require("util"),
    _ = require("underscore"),
    table = "rolle";

function Rolle(tableService) {
    this.task = new Task(tableService, table);
}

Rolle.prototype.get = function (ssn, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ?", ssn);
    this.task.queryEntities(query, function (error, roles) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(_.groupBy(roles, "rolle"));
        }
    });
    return deferred.promise.nodeify(callback);
};

Rolle.prototype.add = function (ssn, role, from, to, codes, names, callback) {
    var deferred = Q.defer(),
        entity = {
            PartitionKey: ssn,
            RowKey: util.format("%s_%s_%s", role, from, to),
            rolle: role,
            fra: from,
            til: to,
            koder: codes.join(","),
            navne: names.join(";")
        };
    this.task.insertOrReplaceEntity(entity, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entity);
        }
    });
    return deferred.promise.nodeify(callback);
};

Rolle.prototype.remove = function (ssn, row, callback) {
    var deferred = Q.defer();
    this.task.deleteEntity({
        PartitionKey: ssn,
        RowKey: row
    }, function (error) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise.nodeify(callback);
};

Rolle.prototype.find = function (ssn, role, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                {
                    table: table,
                    query: { $and: [{ PartitionKey: ssn }, { rolle: role }] }
                } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and rolle eq ?", ssn, role);
    this.task.queryEntities(query, function (error, roles) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(roles);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Rolle;