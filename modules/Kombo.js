"use strict";

var Q = require('Q'),
    _ = require("underscore"),
    Task = require("../modules/Task"),
    Import = require("../modules/Import");

function Kombo(tableService, callback) {
    this.komboTask = new Task(tableService, 'kombo', '', '', callback);
}

Kombo.prototype.install = function (callback) {
    var self = this,
        setup = new Import('kombo.txt');
    console.log("Parsing file");
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        console.log("Parsing done: %d rows", words.length);
        console.log("Mapping rows");
        var kombos = words.map(function (word) {
            return {
                PartitionKey: (word[0] || '').trim(),
                projekt: (word[1] || '').trim(),
                RowKey: (word[2] || '').trim(),
                delregnskab: (word[3] || '').trim(),
                sted: (word[4] || '').trim(),
                aktivitet: (word[1] || '').trim()
            };
        }).filter(function (kombo) {
            return kombo.projekt && kombo.aktivitet && kombo.delregnskab && kombo.sted && kombo.PartitionKey && kombo.RowKey;
        }).map(function (kombo) {
            delete kombo.projekt;
            delete kombo.aktivitet;
            return kombo;
        });
        console.log("Mapping done: %d entities", kombos.length);
        console.log("Installing %d kombos", kombos.length);
        self.komboTask.batchEntities(kombos, function (errors) {
            console.log("Installation completed with %d errors", errors.length);
            callback();
        });
    });
};

Kombo.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ? { table: 'kombo' } : require('azure').TableQuery.select().from('kombo');
    this.komboTask.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

Kombo.prototype.project = function (kode, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ?
                { table: 'kombo', query: { PartitionKey: kode } } :
                require('azure').TableQuery.select().from('kombo').where("PartitionKey eq ?", kode);
    this.komboTask.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

Kombo.prototype.activity = function (project, activity, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ?
                { table: 'kombo', query: { $and: [ { PartitionKey: project }, { RowKey: activity } ] } } :
                require('azure').TableQuery.select().from('kombo').where("PartitionKey eq ? and RowKey eq ?", project, activity);
    this.komboTask.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities[0]);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Kombo;