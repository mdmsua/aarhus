"use strict";

var util = require("util"),
    Q = require("Q"),
    _ = require("underscore"),
    moment = require("moment"),
    Queue = require("../modules/Queue"),
    Projekt = require("../modules/Projekt"),
    Aktivitet = require("../modules/Aktivitet"),
    Kombo = require("../modules/Kombo"),
    Sted = require("../modules/Sted"),
    Delregnskab = require("../modules/Delregnskab"),
    Task = require("../modules/Task"),
    table = "registrering";

function Registration(tableService, queueService) {
    this.projekt = new Projekt(tableService);
    this.activity = new Aktivitet(tableService);
    this.kombo = new Kombo(tableService);
    this.sted = new Sted(tableService);
    this.delregnskab = new Delregnskab(tableService);
    this.queue = new Queue(queueService, "registrering");
    this.registrering = new Task(tableService, table);
}

Registration.prototype.peek = function (callback) {
    var deferred = Q.defer();
    this.queue.peek(10, function (error, messages) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(messages.map(function (message) {
                return JSON.parse(message.messagetext);
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.post = function (registration, callback) {
    var deferred = Q.defer();
    this.queue.enqueue(JSON.stringify(registration), function (error, message) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(message);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.create = function (callback) {
    var deferred = Q.defer(),
        cb = function (error, projects) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(projects);
            }
        };
    process.env.NODE_ENV === 'dev' ?
            this.projekt.query({ $and: [ { PartitionKey: "projekt" }, { navn: /quantum/i } ] }, cb) :
            this.projekt.rows(10410, cb);
    return deferred.promise.nodeify(callback);
};

Registration.prototype.activities = function (project, callback) {
    var self = this;
    this.kombo.project(project, function (error, activities) {
        if (error) {
            callback(error);
        } else {
            var deferred = Q.defer();
            self.activity.names(_.pluck(activities, "RowKey"), function (error, names) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(names);
                }
            });
            return deferred.promise.nodeify(callback);
        }
    });
};

Registration.prototype.stuff = function (project, activity, callback) {
    var self = this;
    this.kombo.activity(project, activity, function (error, stuff) {
        if (error) {
            callback(error);
        } else {
            var deferred = Q.defer();
            Q.all([self.sted.one(stuff.sted), self.delregnskab.one(stuff.delregnskab)]).spread(function (sted, delregnskab) {
                return deferred.resolve({
                    sted: util.format("%s_%s", sted.kode, sted.navn),
                    delregnskab: util.format("%s_%s", delregnskab.kode, delregnskab.navn)
                });
            });
            return deferred.promise.nodeify(callback);
        }
    });
};

Registration.prototype.getDrafts = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { PartitionKey: "kladde" }} :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ?", "kladde");
    this.registrering.queryEntities(query, function (error, drafts) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(drafts.map(function (draft) {
                delete draft._;
                draft.oprettet = moment(new Date(Number(draft.RowKey))).format('LLLL');
                return draft;
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getDraft = function (id, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [{ PartitionKey: "kladde" }, { RowKey: id }] } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and RowKey eq ?", "kladde", id);
    this.registrering.queryEntities(query, function (error, drafts) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(drafts.map(function (draft) {
                delete draft._;
                return draft;
            })[0]);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.saveDraft = function (draft, callback) {
    var deferred = Q.defer();
    draft.PartitionKey = "kladde";
    draft.RowKey = new Date().getTime().toString();
    this.registrering.insertEntity(draft, function (error, draft) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(draft);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.deleteDraft = function (id, callback) {
    var deferred = Q.defer();
    this.registrering.deleteEntity({PartitionKey: "kladde", RowKey: id }, function (error, count) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(count);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getTemplates = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { PartitionKey: "skabelon" }} :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ?", "skabelon");
    this.registrering.queryEntities(query, function (error, templates) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(templates.map(function (template) {
                delete template._;
                return template;
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getTemplate = function (id, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [{ PartitionKey: "skabelon" }, { RowKey: id }] } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and RowKey eq ?", "skabelon", id);
    this.registrering.queryEntities(query, function (error, templates) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(templates.map(function (template) {
                delete template._;
                return template;
            })[0]);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.saveTemplate = function (template, callback) {
    var deferred = Q.defer();
    template.PartitionKey = "skabelon";
    template.RowKey = template.skabelon;
    delete template.skabelon;
    this.registrering.insertEntity(template, function (error, template) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(template);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.deleteTemplate = function (id, callback) {
    var deferred = Q.defer();
    this.registrering.deleteEntity({ PartitionKey: "skabelon", RowKey: id }, function (error, count) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(count);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Registration;