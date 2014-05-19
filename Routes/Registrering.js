"use strict";

var util = require("util"),
    Q = require("Q"),
    _ = require("underscore"),
    Registration = require("../modules/Registration");

function Registrering(tableService, queueService) {
    this.registration = new Registration(tableService, queueService);
}

Registrering.prototype.index = function (req,  res, next) {
    Q.all([this.registration.peek(), this.registration.getJobCategories(), this.registration.getOrganisations()]).spread(function (registrations, jobCategories, organisations) {
        res.render("registrering/index", { title: "Registrering", registreringer: registrations, jobkategorier: jobCategories, enheder: organisations });
    });
};

Registrering.prototype.create = function (req,  res, next) {
    var jobkategori = req.query.jobkategori,
        enhed = req.query.enhed,
        queue = [];
    queue.push(this.registration.getJobCategories());
    queue.push(this.registration.getDrafts());
    queue.push(this.registration.getTemplates());
    queue.push(this.registration.getLkos());
    if (enhed) {
        queue.push(this.registration.getOrganisations());
    }
    Q.all(queue).spread(function (jobCategories, drafts, templates, lkos, organisations) {
        var model = {
            title: "Registrering",
            jobkategorier: jobCategories,
            kladder: drafts || [],
            skabeloner: templates || [],
            jobkategori: jobkategori,
            enhed: enhed,
            lkos: _.where(lkos, { kode: (_.findWhere(jobCategories, { uuid: jobkategori }) || { lko: 0 }).lko.toString() })
        };
        if (organisations) {
            model.enheder = organisations;
        }
        res.render("registrering/ny", model);
    }, function (error) {
        next(error);
    });
};

Registrering.prototype.project = function (req,  res, next) {
    this.registration.activities(req.params.kode, function (error, activities) {
        if (error) {
            next(error);
        } else {
            res.json(activities.map(function (activity) { return { id: activity.kode, text: activity.navn }; }));
        }
    });
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

Registrering.prototype.forJobCategory = function (req,  res, next) {
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


module.exports = Registrering;