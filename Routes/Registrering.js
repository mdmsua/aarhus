"use strict";

var util = require("util"),
    Q = require("Q"),
    _ = require("underscore"),
    Registration = require("../modules/Registration");

function Registrering(tableService, queueService) {
    this.registration = new Registration(tableService, queueService);
}

Registrering.prototype.index = function (req,  res) {
    Q.all([this.registration.get(0, req.user), this.registration.getJobCategories(req.user), this.registration.getOrganisations(req.user)]).spread(function (registrations, jobCategories, organisations) {
        res.render("registrering/index", { title: "Registrering", registreringer: registrations, jobkategorier: jobCategories, enheder: organisations });
    });
};

Registrering.prototype.create = function (req,  res) {
    var jobkategori = req.query.jobkategori,
        enhed = req.query.enhed;
    res.render("registrering/ny", { title: "Registrering", jobkategorikode: jobkategori, enhedkode: enhed });
};

Registrering.prototype.getJobCategories = function (req,  res, next) {
    var self = this;
    if (req.params.ssn) {
        self.registration.getEmployeeBySSN(req.params.ssn, function (error, employee) {
            if (error) {
                next(error);
            } else {
                self.registration.getJobCategories(employee, function (error, jobCategories) {
                    if (error) {
                        next(error);
                    } else {
                        res.json(jobCategories);
                    }
                });
            }
        });
    } else {
        self.registration.getJobCategories(req.user, function (error, jobCategories) {
            if (error) {
                next(error);
            } else {
                res.json(jobCategories);
            }
        });
    }
};

Registrering.prototype.byProjectActivity = function (req,  res, next) {
    this.registration.stuff(req.params.projekt, req.params.kode, function (error, stuff) {
        if (error) {
            next(error);
        } else {
            res.json(stuff);
        }
    });
};

Registrering.prototype.saveDraft = function (req, res, next) {
    delete req.body.skabelon;
    this.registration.saveDraft(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.deleteDraft = function (req, res, next) {
    this.registration.deleteDraft(req.params.id, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.saveTemplate = function (req, res, next) {
    this.registration.saveTemplate(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.deleteTemplate = function (req, res, next) {
    this.registration.deleteTemplate(req.params.id, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.send = function (req, res, next) {
    delete req.body.skabelon;
    var self = this;
    this.registration.getEmployees(function (error, employees) {
        if (error) {
            next(error);
        } else {
            var employee = employees[new Date().getDay()];
            req.body.medarbejder = util.format("%s_%s %s", employee.ssn, employee.firstName, employee.lastName);
            req.body.logs = req.body.logs || [];
            req.body.logs.push({
                when: new Date(),
                name: util.format("%s %s", employee.firstName, employee.lastName),
                what: "Oprettet",
                text: req.body.kommentar
            });
            self.registration.post(req.body, function (error) {
                if (error) {
                    next(error);
                } else {
                    res.redirect("/registrering");
                }
            });
        }
    });
};

Registrering.prototype.findOrganizations = function (req,  res, next) {
    Q.all([this.registration.getOrganisations(), this.registration.getLkos(), this.registration.getJobCategories()]).spread(function (organizations, lkos, jobCategories) {
        var jobCategory = _.findWhere(jobCategories, { uuid: req.params.jobkategori });
        res.json({
            organizations: organizations.map(function (organization) {
                return { id: organization.kode, text: organization.navn };
            }),
            lkos: lkos.filter(function (lko) {
                return jobCategory.lko.toString() === lko.kode;
            }).map(function (lko) {
                return { id: lko.kode, text: lko.navn };
            })
        });
    }, function (error) {
        next(error);
    });
};

Registrering.prototype.forOrganization = function (req,  res, next) {
    this.registration.getLocations(req.params.enhed, function (error, locations) {
        if (error) {
            next(error);
        } else {
            res.json(locations.map(function (location) {
                return {
                    id: location.kode,
                    text: location.navn
                };
            }));
        }
    });
};

Registrering.prototype.forLocation = function (req,  res, next) {
    this.registration.getForLocation(req.params.sted, function (error, kombo) {
        if (error) {
            next(error);
        } else {
            res.json({
                projects: kombo.projects.map(function (project) {
                    return {
                        id: project.kode,
                        text: project.navn
                    };
                }),
                activities: kombo.activities.map(function (activity) {
                    return {
                        id: activity.kode,
                        text: activity.navn
                    };
                })
            });
        }
    });
};

Registrering.prototype.account = function (req,  res, next) {
    this.registration.getAccounts(req.params.projekt, req.params.aktivitet, function (error, accounts) {
        if (error) {
            next(error);
        } else {
            res.json(accounts.map(function (location) {
                return {
                    id: location.kode,
                    text: location.navn
                };
            }));
        }
    });
};

Registrering.prototype.remove = function (req,  res, next) {
    var id = req.params.id,
        self = this;
    this.registration.get(id, function (error, message) {
        if (error) {
            next(error);
        } else {
            self.registration.remove(message, function (error, success) {
                if (error) {
                    next(error);
                } else {
                    res.send(success ? 200 : 400);
                }
            });
        }
    });
};

module.exports = Registrering;