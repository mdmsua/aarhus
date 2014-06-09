"use strict";

var util = require("util"),
    Q = require("Q"),
    moment = require("moment"),
    Task = require("../modules/Task"),
    table = "samtale";

moment.lang("da");

function Samtale(tableService) {
    this.task = new Task(tableService, table);
}

Samtale.prototype.find = function (registration, role, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { PartitionKey: registration } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ?", registration);
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities.filter(function (entity) {
                return role === "Timelønnede" ? entity.rolle !== "økonom" : true;
            }).map(function (entity) {
                entity.dato = moment(Number(entity.RowKey)).format("DD-MM-YYYY, HH:mm:ss");
                return entity;
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Samtale.prototype.remove = function (id, callback) {
    var deferred = Q.defer(),
        self = this;
    this.find(id, null, function (error, items) {
        if (error) {
            deferred.reject(error);
        } else {
            items.forEach(function (item) {
                self.task.deleteEntity(item);
            });
            deferred.resolve();
        }
    });
    return deferred.promise.nodeify(callback);
};

Samtale.prototype.add = function (registration, entity, callback) {
    var deferred = Q.defer();
    entity.PartitionKey = registration;
    entity.RowKey = new Date().getTime().toString();
    this.task.insertEntity(entity, function (error) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Samtale;