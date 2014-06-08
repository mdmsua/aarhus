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
    JobOrg = require("../modules/JobOrg"),
    Rolle = require("../modules/Rolle"),
    format = "DD-MM-YYYY";

function Medarbejder(tableService, redisClient) {
    this.employee = new Employee(tableService);
    this.jobCategoryConfig = new JobCategoryConfig(tableService);
    this.pkat = new Pkat(tableService);
    this.jobCategory = new JobCategory(tableService);
    this.enhed = new Enhed(tableService);
    this.joborg = new JobOrg(tableService);
    this.delregnskab = new Delregnskab(tableService);
    this.projekt = new Projekt(tableService);
    this.aktivitet = new Aktivitet(tableService);
    this.sted = new Sted(tableService);
    this.rolle = new Rolle(tableService);
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
    Q.all([this.employee.one(req.params.ssn), this.joborg.get(req.params.ssn), this.rolle.get(req.params.ssn)]).spread(function (employee, jobs, roles) {
        employee.name = util.format("%s %s (%s)", employee.fornavn, employee.efternavn, employee.cpr);
        employee.roller = employee.roller ? employee.roller.split(",") : "";
        employee.dato = employee.dato ? moment(employee.dato).format(format) : "";
        employee.jobkategorier = jobs.map(function (job) {
            job.now = moment().isBefore(moment(job.til, format)) && moment().isAfter(moment(job.fra, format));
            if (!job.hasOwnProperty("fra")) {
                job.fra = "";
            }
            if (!job.hasOwnProperty("til")) {
                job.til = "";
            }
            job.enheder.forEach(function (enhed) {
                if (!enhed.hasOwnProperty("fra")) {
                    enhed.fra = "";
                }
                if (!enhed.hasOwnProperty("til")) {
                    enhed.til = "";
                }
                enhed.now = moment().isBefore(moment(enhed.til, format)) && moment().isAfter(moment(enhed.fra, format));
            });
            return job;
        });
        var rls = [], role;
        for (role in roles) {
            if (roles.hasOwnProperty(role)) {
                rls.push({
                    rolle: role,
                    enheder: roles[role].map(function (r) {
                        return {
                            fra: r.fra,
                            til: r.til,
                            koder: r.koder.split(","),
                            navne: r.navne.split(";"),
                            now: moment().isBefore(moment(r.til, format)) && moment().isAfter(moment(r.fra, format))
                        };
                    })
                });
            }
        }
        employee.enheder = rls;
        res.render("medarbejder/info", { title: "Medarbejder", employee: employee });
    }, function (error) {
        next(error);
    });
};

Medarbejder.prototype.create = function (req, res, next) {
    var self = this;
    res.locals.url = req.originalUrl;
    Q.all([
        this.jobCategoryConfig.all(),
        this.enhed.all()
    ]).spread(function (configs, organizations) {
        res.render("medarbejder/opdater", { title: "Medarbejder", jobkategorier: configs, enheder: organizations, medarbejder: { } });
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
    res.locals.url = req.originalUrl;
    Q.all([
        this.employee.one(req.params.ssn),
        this.joborg.get(req.params.ssn),
        this.jobCategoryConfig.all(),
        this.enhed.all(),
        this.rolle.get(req.params.ssn)]).spread(function (employee, jobs, configs, organizations, roles) {
        var model = {
            title: "Medarbejder",
            medarbejder: employee,
            jobkategorier: configs,
            enheder: organizations
        };
        model.medarbejder.jobkategorier = jobs.map(function (job) {
            job.now = moment().isBefore(moment(job.til, format)) && moment().isAfter(moment(job.fra, format));
            job.enheder.forEach(function (enhed) {
                enhed.now = moment().isBefore(moment(enhed.til, format)) && moment().isAfter(moment(enhed.fra, format));
            });
            return job;
        });
        model.medarbejder.roller = model.medarbejder.roller ? model.medarbejder.roller.split(",") : [];
        var rls = [], role;
        for (role in roles) {
            if (roles.hasOwnProperty(role)) {
                rls.push({
                    rolle: role,
                    enheder: roles[role].map(function (r) {
                        return {
                            fra: r.fra,
                            til: r.til,
                            navne: r.navne.split(";"),
                            koder: r.koder.split(",")
                        };
                    })
                });
            }
        }
        employee.enheder = rls;
        model.medarbejder.dato = model.medarbejder.dato ? moment(model.medarbejder.dato).format("DD-MM-YYYY") : "";
        res.render("medarbejder/opdater", model);
    }, function (error) {
        next(error);
    });
};

Medarbejder.prototype.save = function (req, res, next) {
    var self = this,
        jobs = req.body.job ? JSON.parse(req.body.job) : null,
        orgs = req.body.org ? JSON.parse(req.body.org) : null,
        ssn = req.body.cpr;
    delete req.body.job;
    delete req.body.org;
    this.joborg.deleteAll(ssn, function (error) {
        if (error) {
            next(error);
        } else {
            req.body.initialer = req.body.initialer.toLowerCase();
            self.employee.save(req.body, function (error) {
                if (error) {
                    next(error);
                } else {
                    var queue = [];
                    if (jobs) {
                        queue.push(self.joborg.addJobs(ssn, jobs));
                    }
                    if (orgs) {
                        orgs.forEach(function (org) {
                            (org.enheder || []).forEach(function (enhed) {
                                queue.push(self.rolle.add(ssn, org.rolle, enhed.fra, enhed.til, enhed.koder, enhed.navne));
                            });
                        });
                    }
                    Q.all(queue).spread(function () {
                        res.redirect("/medarbejder/" + ssn);
                    }, function (error) {
                        next(error);
                    });
                }
            });
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
    this.joborg.removeJob(req.params.id, req.params.ssn, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/medarbejder/" + req.params.ssn);
        }
    });
};

Medarbejder.prototype.deleteOrg = function (req, res, next) {
    this.joborg.removeOrg(req.params.id, req.params.ssn, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/medarbejder/" + req.params.ssn);
        }
    });
};

module.exports = Medarbejder;