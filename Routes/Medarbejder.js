"use strict";

var util = require("util"),
    Q = require("Q"),
    _ = require("underscore"),
    moment = require("moment"),
    Employee = require("../modules/Medarbejder"),
    JobCategoryConfig = require("../modules/JobCategoryConfig"),
    Pkat = require("../modules/Pkat"),
    JobCategory = require("../modules/JobCategory"),
    Enhed = require("../modules/Enhed"),
    Delregnskab = require("../modules/Delregnskab"),
    Projekt = require("../modules/Projekt"),
    Aktivitet = require("../modules/Aktivitet"),
    Sted = require("../modules/Sted"),
    MedarbejderJob = require("../modules/MedarbejderJob");

function Medarbejder(tableService, redisClient) {
    this.employee = new Employee(tableService);
    this.jobCategoryConfig = new JobCategoryConfig(tableService);
    this.pkat = new Pkat(tableService);
    this.jobCategory = new JobCategory(tableService);
    this.enhed = new Enhed(tableService);
    this.medarbejderJob = new MedarbejderJob(tableService);
    this.delregnskab = new Delregnskab(tableService);
    this.projekt = new Projekt(tableService);
    this.aktivitet = new Aktivitet(tableService);
    this.sted = new Sted(tableService);
    this.redisClient = redisClient;
}

moment.lang("da");

Medarbejder.prototype.lookupSet = function (set, q, callback) {
    var deferred = Q.defer(),
        regexp = new RegExp(q, "gi"),
        key = null;
    this.redisClient.hgetall(set, function (error, object) {
        if (error) {
            deferred.reject(error);
        } else {
            var results = [];
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    if (regexp.test(object[key])) {
                        results.push({
                            id: key,
                            text: object[key]
                        });
                    }
                }
            }
            deferred.resolve(results);
        }
    });
    return deferred.promise.nodeify(callback);
};

Medarbejder.prototype.lookupStr = function (set, q, callback) {
    var deferred = Q.defer(),
        regexp = new RegExp(q, "gi"),
        key = null;
    this.redisClient.get(set, function (error, value) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(JSON.parse(value).filter(function (object) {
                return regexp.test(object.navn);
            }).map(function (object) {
                return {
                    id: object.kode,
                    text: object.navn
                };
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Medarbejder.prototype.index = function (req, res) {
    res.render("medarbejder/index", { title: "Medarbejder" });
};

Medarbejder.prototype.search = function (req, res) {
    this.employee.all(function (error, employees) {
        if (error) {
            throw error;
        }
        var regexp = new RegExp(req.body.q, "gi"),
            results = employees.filter(function (employee) {
                return regexp.test(employee.cpr.concat(employee.fornavn, employee.efternavn));
            }).map(function (employee) {
                employee.name = util.format("%s %s (%s)", employee.fornavn, employee.efternavn, employee.cpr);
                return employee;
            });
        if (results.length === 1) {
            res.redirect("/medarbejder/".concat(results[0].cpr));
        } else {
            res.render("medarbejder", { title: "Medarbejder", employees: results });
        }
    });
};

Medarbejder.prototype.get = function (req, res, next) {
    Q.all([this.employee.one(req.params.ssn), this.medarbejderJob.get(req.params.ssn)]).spread(function (employee, jobs) {
        employee.name = util.format("%s %s (%s)", employee.fornavn, employee.efternavn, employee.cpr);
        employee.roller = employee.roller ? employee.roller.split(",") : "";
        employee.enheder = employee.enheder ? employee.enheder.split(",") : "";
        employee.dato = employee.dato ? moment(employee.dato).format("DD-MM-YYYY") : "";
        employee.jobkategorier = jobs;
        res.render("medarbejder/info", { title: "Medarbejder", employee: employee });
    });
};

Medarbejder.prototype.create = function (req, res, next) {
    var self = this;
    Q.all([
        this.jobCategoryConfig.all(),
        this.enhed.all()
    ]).spread(function (configs, organizations) {
        res.render("medarbejder/opret", { title: "Medarbejder", jobkategorier: configs, enheder: organizations, medarbejder: { } });
        self.redisClient.strlen("projekt", function (error, len) {
            if (error) {
                next(error);
            } else if (!len) {
                self.projekt.all(function (error, projects) {
                    if (error) {
                        next(error);
                    } else {
                        /*projects.forEach(function (project) {
                            self.redisClient.hset("projekt", project.kode, project.navn);
                        });*/
                        self.redisClient.set("projekt", JSON.stringify(projects));
                    }
                });
            }
        });
        self.redisClient.strlen("aktivitet", function (error, len) {
            if (error) {
                next(error);
            } else if (!len) {
                self.aktivitet.all(function (error, aktivities) {
                    if (error) {
                        next(error);
                    } else {
                        /*aktivities.forEach(function (aktivity) {
                            self.redisClient.hset("aktivitet", aktivity.kode, aktivity.navn);
                        });*/
                        self.redisClient.set("aktivitet", JSON.stringify(aktivities));
                    }
                });
            }
        });
    }, function (error) {
        next(error);
    });
};

Medarbejder.prototype.update = function (req, res, next) {
    Q.all([
        this.employee.one(req.params.ssn),
        this.medarbejderJob.get(req.params.ssn),
        this.jobCategoryConfig.all(),
        this.enhed.all()]).spread(function (employee, jobs, configs, organizations) {
        var model = {
            title: "Medarbejder",
            medarbejder: employee,
            jobkategorier: configs,
            enheder: organizations
        };
        model.medarbejder.jobkategorier = jobs;
        model.medarbejder.roller = model.medarbejder.roller ? model.medarbejder.roller.split(",") : [];
        model.medarbejder.enheder = model.medarbejder.enheder ? model.medarbejder.enheder.split(",") : [];
        model.medarbejder.dato = model.medarbejder.dato ? moment(model.medarbejder.dato).format("DD-MM-YYYY") : "";
        res.render("medarbejder/opdatering", model);
    }, function (error) {
        next(error);
    });
};

Medarbejder.prototype.save = function (req, res, next) {
    var self = this,
        job = req.body.job ? JSON.parse(req.body.job) : null,
        ssn = req.body.cpr;
    delete req.body.job;
    this.employee.save(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            if (job) {
                self.medarbejderJob.addJob(ssn, job, function (error) {
                    if (error) {
                        next(error);
                    } else {
                        res.redirect("/medarbejder/" + ssn);
                    }
                });
            } else {
                res.redirect("/medarbejder/" + ssn);
            }
        }
    });
};

Medarbejder.prototype.organisations = function (req, res, next) {
    this.enhed.all(function (error, enheder) {
        if (error) {
            next(error);
        } else {
            res.json(enheder.map(function (enhed) {
                return {
                    id: enhed.kode,
                    text: enhed.navn
                };
            }));
        }
    });
};

Medarbejder.prototype.config = function (req, res, next) {
    var self = this;
    this.jobCategoryConfig.one(req.params.uuid, function (error, config) {
        if (error) {
            next(error);
        } else {
            self.pkat.one(config.pkat, function (error, pkat) {
                if (error) {
                    next(error);
                } else {
                    res.json([pkat]);
                }
            });
        }
    });
};

Medarbejder.prototype.accounts = function (req, res, next) {
    this.delregnskab.all(function (error, accounts) {
        if (error) {
            next(error);
        } else {
            res.json(accounts);
        }
    });
};

Medarbejder.prototype.projects = function (req, res, next) {
    this.lookupStr("projekt", req.query.q, function (error, projects) {
        if (error) {
            next(error);
        } else {
            res.json(projects);
        }
    });
};

Medarbejder.prototype.activities = function (req, res, next) {
    this.lookupStr("aktivitet", req.query.q, function (error, projects) {
        if (error) {
            next(error);
        } else {
            res.json(projects);
        }
    });
};

Medarbejder.prototype.locations = function (req, res, next) {
    this.sted.all(function (error, locations) {
        if (error) {
            next(error);
        } else {
            res.json(locations);
        }
    });
};

Medarbejder.prototype.organizations = function (req, res, next) {
    this.enhed.all(function (error, organisations) {
        if (error) {
            next(error);
        } else {
            res.json(organisations);
        }
    });
};

Medarbejder.prototype.deleteJob = function (req, res, next) {
    this.medarbejderJob.removeJob(req.params.id, req.params.ssn, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/medarbejder/" + req.params.ssn);
        }
    });
};

Medarbejder.prototype.deleteOrg = function (req, res, next) {
    this.medarbejderJob.removeOrg(req.params.id, req.params.ssn, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/medarbejder/" + req.params.ssn);
        }
    });
};

module.exports = Medarbejder;