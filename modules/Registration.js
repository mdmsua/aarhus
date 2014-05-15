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
    JobCategoryConfig = require("../modules/JobCategoryConfig"),
    Enhed = require("../modules/Enhed"),
    Lko = require("../modules/Lko"),
    Task = require("../modules/Task"),
    table = "registrering";

function Registration(tableService, queueService) {
    this.projekt = new Projekt(tableService);
    this.aktivitet = new Aktivitet(tableService);
    this.kombo = new Kombo(tableService);
    this.sted = new Sted(tableService);
    this.delregnskab = new Delregnskab(tableService);
    this.queue = new Queue(queueService, "registrering");
    this.registrering = new Task(tableService, table);
    this.jobCategoryConfig = new JobCategoryConfig(tableService);
    this.enhed = new Enhed(tableService);
    this.lko = new Lko(tableService);
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

Registration.prototype.getForOrganization = function (organization, callback) {
    var self = this,
        deferred = Q.defer();
    this.enhed.one(organization, function (error, enhed) {
        if (error) {
            deferred.reject(error);
        } else {
            self.kombo.byLocation(enhed.location, function (error, kombos) {
                if (error) {
                    deferred.reject(error);
                } else {
                    var projects = _.uniq(_.pluck(kombos, "PartitionKey")),
                        activities = _.uniq(_.pluck(kombos, "RowKey")),
                        accounts = _.uniq(_.pluck(kombos, "delregnskab"));
                    Q.all([self.projekt.ones(projects),
                        self.aktivitet.ones(activities),
                        self.delregnskab.ones(accounts),
                        self.sted.one(enhed.location)])
                        .spread(function (projects, activities, accounts, location) {
                            deferred.resolve({
                                projects: projects,
                                activities: activities,
                                accounts: accounts,
                                location: location
                            });
                        }, function (error) {
                            deferred.reject(error);
                        });
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getForLocation = function (location, callback) {
    var self = this,
        deferred = Q.defer();
    this.kombo.byLocation(location, function (error, kombos) {
        if (error) {
            deferred.reject(error);
        } else {
            var projects = _.uniq(_.pluck(kombos, "PartitionKey")),
                activities = _.uniq(_.pluck(kombos, "RowKey"));
            Q.all([self.projekt.ones(projects), self.aktivitet.ones(activities)])
                .spread(function (projects, activities) {
                    deferred.resolve({
                        projects: projects,
                        activities: activities
                    });
                }, function (error) {
                    deferred.reject(error);
                });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.activities = function (project, callback) {
    var self = this;
    this.kombo.project(project, function (error, activities) {
        if (error) {
            callback(error);
        } else {
            var deferred = Q.defer();
            self.byProjectActivity.ones(_.pluck(activities, "RowKey"), function (error, names) {
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
    this.kombo.byProjectActivity(project, activity, function (error, stuff) {
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
                { table: table, query: { $and: [
                    { PartitionKey: "kladde" },
                    { RowKey: id }
                ] } } :
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
                { table: table, query: { $and: [
                    { PartitionKey: "skabelon" },
                    { RowKey: id }
                ] } } :
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

Registration.prototype.getJobCategories = function (callback) {
    var deferred = Q.defer();
    this.jobCategoryConfig.top(4, function (error, jobCategories) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(jobCategories);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getLkos = function (callback) {
    var deferred = Q.defer();
    this.lko.all(function (error, lkos) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(lkos);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getOrganisations = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: "enhed", query: { $or: [
                    { location: 1911 },
                    { location: 1191 }
                ]} } :
                require("azure").TableQuery.select().from("enhed").where("location eq ? or location eq ?", 1911, 1191);
    this.enhed.query(query, function (error, organisations) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(organisations);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getLocations = function (organization, callback) {
    var deferred = Q.defer(),
        self = this;
    this.enhed.one(organization, function (error, organization) {
        if (error) {
            deferred.reject(error);
        } else {
            self.sted.one(organization.location, function (error, location) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve([location]);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getAccounts = function (project, activity, callback) {
    var deferred = Q.defer(),
        self = this;
    this.kombo.byProjectActivity(project, activity, function (error, accounts) {
        if (error) {
            deferred.reject(error);
        } else {
            self.delregnskab.ones(_.pluck(accounts, "delregnskab"), function (error, accounts) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(accounts);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Registration;