"use strict";

var util = require('util'),
    _ = require('underscore'),
    Import = require('../modules/Import'),
    Task = require('../modules/Task'),
    KodeNavn = require('../modules/KodeNavn');

function Aktivitet(tableService) {
    KodeNavn.call(this, tableService, 'aktivitet');
    this.task = new Task(tableService, 'kodenavn', 'aktivitet', 'kode', function () { });
}

util.inherits(Aktivitet, KodeNavn);

Aktivitet.prototype.install = function (callback) {
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
        var entities = words.map(function (word) {
            return {
                kode: (word[2] || '').trim(),
                navn: (word[5] || '').trim()
            };
        }).filter(function (entity) {
            return entity.kode && entity.navn;
        }),
            activities = [];
        console.log("Mapping done: %d entities", entities.length);
        _.each(_.uniq(_.pluck(entities, "kode")), function (kode) {
            var entity = _.findWhere(entities, { kode: kode });
            if (entity) {
                activities.push(entity);
            }
        });
        console.log("Installing %d activities", activities.length);
        self.task.batchEntities(activities, callback);
    });
};

module.exports = Aktivitet;