"use strict";

var Q = require('Q'),
    Import = require("../modules/Import"),
    Task = require("../modules/Task");

function Enhed(tableService) {
    this.task = new Task(tableService, "enhed", "enhed", "kode", function () { });
}

Enhed.prototype.install = function (callback) {
    var self = this,
        setup = new Import('enhed.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var enheds = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                parent: (word[1] || '').trim(),
                navn: (word[2] || '').trim(),
                sted: (word[3] || '').trim()
            };
        });
        self.task.batchEntities(enheds, callback);
    });
};

Enhed.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ? { table: 'enhed' } : require('azure').TableQuery.select().from('enhed');
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

Enhed.prototype.one = function (kode, callback) {
    var deferred = Q.defer();
    this.task.queryEntity(kode, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entity);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Enhed;