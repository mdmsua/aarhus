"use strict";

var util = require("util"),
    Q = require("Q"),
    Task = require("../modules/Task"),
    table = "samtale";

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
                return role === "Medarbejeder" ? entity.rolle !== "økonom" : true;
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

module.exports = Samtale;