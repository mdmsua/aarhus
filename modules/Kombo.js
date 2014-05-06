"use strict";

var Q = require('Q'),
    _ = require("underscore"),
    Task = require("../modules/Task"),
    Import = require("../modules/Import");

function Kombo(tableService, callback) {
    this.projektTask = new Task(tableService, 'kodenavn', 'projekt', 'kode', callback);
    this.aktititetTask = new Task(tableService, 'kodenavn', 'aktivitet', 'kode', callback);
    this.delregnskabTask = new Task(tableService, 'kodenavn', 'delregnskab', 'kode', callback);
    this.stedTask = new Task(tableService, 'kodenavn', 'sted', 'kode', callback);
}

Kombo.prototype.install = function (callback) {
    var self = this,
        setup = new Import('kombo.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var kombos = words.map(function (word) {
            return {
                projekt_kode: Number((word[0] || '').trim()),
                projekt_navn: (word[1] || '').trim(),
                aktivitet_kode: Number((word[2] || '').trim()),
                delregnskab_kode: Number((word[3] || '').trim()),
                sted_kode: Number((word[4] || '').trim()),
                aktivitet_navn: (word[5] || '').trim()
            };
        }), projects = [], activities = [], projekt_kodes = _.uniq(_.pluck(kombos, 'projekt_kode'));
        console.log("kombos.length", kombos.length);
        console.log("Installing projects...");
        _.each(projekt_kodes, function (kode, index) {
            if (!isNaN(kode)) {
                var project = _.findWhere(kombos, { projekt_kode: kode });
                if (project) {
                    projects.push({
                        kode: project.projekt_kode,
                        navn: project.projekt_navn
                    });
                } else {
                    console.warn('Project 404: %d', kode);
                }
            }
        });
        self.projektTask.batchEntities(projects, function (error) {
            if (error) {
                callback(error);
            } else {
                console.log("Done installing projects");
            }
        });
//        console.log("Installing activities...");
//        _.each(_.uniq(_.pluck(kombos, 'aktivitet_kode')), function (kode) {
//            var activity = _.findWhere(kombos, { aktivitet_kode: kode });
//            if (activity) {
//                activities.push({
//                    kode: activity.aktivitet_kode,
//                    navn: activity.aktivitet_navn
//                });
//            } else {
//                console.warn('Activity 404: %d', kode);
//            }
//        });
//        self.aktititetTask.batchEntities(activities, function (error) {
//            if (error) {
//                callback(error);
//            } else {
//                console.log("Done installing activities");
//            }
//        });

    });
};

Kombo.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ? { table: 'employee' } : require('azure').TableQuery.select().from('employee');
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Kombo;