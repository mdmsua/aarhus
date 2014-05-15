"use strict";

var Q = require('Q'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import");

function KodeNavn(tableService, kodenavn, callback) {
    this.task = new Task(tableService, 'kodenavn', kodenavn, 'kode', callback);
    this.kodenavn = kodenavn;
}

KodeNavn.prototype.install = function (callback) {
    var self = this,
        setup = new Import(this.kodenavn + '.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var entities = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        self.task.batchEntities(entities, callback);
    });
};

KodeNavn.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ?
                { table: 'kodenavn', query: { PartitionKey: { $eq: this.kodenavn } } } :
                require('azure').TableQuery.select().from('kodenavn').where('PartitionKey eq ?', this.kodenavn);
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

KodeNavn.prototype.one = function (id, callback) {
    var deferred = Q.defer();
    this.task.queryEntity(id, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entity);
        }
    });
    return deferred.promise.nodeify(callback);
};

KodeNavn.prototype.rows = function (count, callback) {
    var deferred = Q.defer(),
        query = require("azure").TableQuery.select().from("kodenavn").where("PartitionKey eq ? and RowKey le ?", this.kodenavn, count.toString());
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

KodeNavn.prototype.query = function (query, callback) {
    var deferred = Q.defer();
    this.task.queryEntities({ table: "kodenavn", query: query }, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

KodeNavn.prototype.ones = function (ids, callback) {
    var deferred = Q.defer(),
        promises = [],
        self = this;
    ids.forEach(function (id) {
        promises.push(self.one(id));
    });
    Q.all(promises).done(function (entities) {
        deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

module.exports = KodeNavn;