"use strict";

var util = require("util"),
    moment = require("moment"),
    Q = require("Q"),
    _ = require("underscore"),
    Registration = require("../modules/Registration");

function Registrering(tableService) {
    this.registration = new Registration(tableService);
}

Registrering.prototype.index = function (req,  res) {
    var count = _.intersection(req.user.roller, ["Timelønnede", "Sekretær", "økonom"]).length;
    if (count > 1) {
        res.render("registrering/index", { title: "Registrering", count: count });
    } else {
        switch (req.user.roller[0]) {
        case "Timelønnede":
            res.redirect("/registrering/lock/0");
            break;
        case "Sekretær":
            res.redirect("/registrering/lock/1");
            break;
        case "økonom":
            res.redirect("/registrering/lock/2");
            break;
        }
    }
};

Registrering.prototype.employee = function (req,  res, next) {
    var self = this,
        period = parseInt(req.params.period, 10) || 0,
        lock = Number(req.params.lock),
        i,
        orgs = [],
        count = _.intersection(req.user.roller, ["Timelønnede", "Sekretær", "økonom"]).length;
    if (count === 0) {
        res.render(403);
    } else {
        switch (lock) {
        case 0:
            Q.all([
                this.registration.get(-1, period, req.user),
                this.registration.get(0, period, req.user),
                this.registration.get(3, period, req.user),
                this.registration.getJobCategories(req.params.ssn || req.user.cpr),
                this.registration.getOrganisations(req.params.ssn || req.user.cpr),
                this.registration.getPreferences(req.user.cpr, "Timelønnede")
            ]).spread(function (minusOnes, zeros, threes, jobCategories, organisations, preferences) {
                res.render("registrering/employee", {
                    title: "Registrering",
                    registreringer: _.union(minusOnes, zeros, threes),
                    jobkategorier: jobCategories,
                    enheder: organisations,
                    indstillinger: preferences,
                    period: period
                });
            });
            break;
        case 1:
            Q.all([
                this.registration.get(-3, period, null),
                this.registration.get(-2, period, null),
                this.registration.get(0, period, null),
                this.registration.get(1, period, null),
                this.registration.get(2, period, null),
                this.registration.get(3, period, null),
                this.registration.getOrganisationsForRole(req.user.cpr, "Sekretær"),
                this.registration.getPreferences(req.user.cpr, "Sekretær")
            ]).spread(function (minusThrees, minusTwos, zeros, ones, twos, threes, organisations, preferences) {
                organisations.forEach(function (organization) {
                    for (i = 0; i < organization.koder.split(",").length; i += 1) {
                        orgs.push({
                            kode: organization.koder.split(",")[i],
                            navn: organization.navne.split(";")[i]
                        });
                    }
                });
                self.registration.findEmployeesInOrganizations(organisations, function (error, employees) {
                    if (error) {
                        next(error);
                    } else {
                        res.render("registrering/secretary", {
                            title: "Registrering",
                            registreringer: _.union(minusThrees, minusTwos, zeros, ones, twos, threes),
                            enheder: orgs,
                            indstillinger: preferences,
                            period: period,
                            medarbejdere: employees
                        });
                    }
                });

            });
            break;
        default:
            Q.all([
                this.registration.get(-3, period, null),
                this.registration.get(1, period, null),
                this.registration.get(2, period, null),
                this.registration.get(3, period, null),
                this.registration.getOrganisationsForRole(req.user.cpr, "Sekretær"),
                this.registration.getPreferences(req.user.cpr, "Sekretær")
            ]).spread(function (minusThrees, ones, twos, threes, organisations, preferences) {
                organisations.forEach(function (organization) {
                    for (i = 0; i < organization.koder.split(",").length; i += 1) {
                        orgs.push({
                            kode: organization.koder.split(",")[i],
                            navn: organization.navne.split(";")[i]
                        });
                    }
                });
                self.registration.findEmployeesInOrganizations(organisations, function (error, employees) {
                    if (error) {
                        next(error);
                    } else {
                        res.render("registrering/economist", {
                            title: "Registrering",
                            registreringer: _.union(minusThrees, ones, twos, threes),
                            enheder: orgs,
                            indstillinger: preferences,
                            period: period,
                            medarbejdere: employees
                        });
                    }
                });

            });
            break;
        }
    }
};

Registrering.prototype.create = function (req, res, next) {
    var jobkategori = req.query.jobkategori,
        enhed = req.query.enhed,
        self = this;
    res.locals.url = req.originalUrl;
    if (req.params.lock === "1") {
        self.registration.getOrganisationsForRole(req.user.cpr, "Sekretær", function (error, organisations) {
            if (error) {
                next(error);
            } else {
                self.registration.findEmployeesInOrganizations(organisations, function (error, employees) {
                    if (error) {
                        next(error);
                    } else {
                        res.render("registrering/gem", { title: "Registrering", registrering: { dato: moment().format("DD-MM-YYYY"), felt1: 0, jobkategorikode: jobkategori, enhedkode: enhed}, cpr: req.query.medarbejder, medarbejdere: employees });
                    }
                });
            }
        });
    } else {
        res.render("registrering/gem", { title: "Registrering", registrering: { dato: moment().format("DD-MM-YYYY"), felt1: 0, jobkategorikode: jobkategori, enhedkode: enhed}, cpr: req.params.lock === "0" ? req.user.cpr : req.query.medarbejder });
    }
};

Registrering.prototype.getJobCategories = function (req,  res, next) {
    this.registration.getJobCategories(req.params.ssn, function (error, jobCategories) {
        if (error) {
            next(error);
        } else {
            res.json(jobCategories);
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
    req.body.medarbejderkode = req.body.medarbejderkode || req.user.cpr;
    req.body.medarbejdernavn = req.body.medarbejdernavn || req.user.navn;
    req.body.lock = parseInt(req.params.lock, 10);
    this.registration.create(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering/lock/" + req.params.lock);
        }
    });
};

Registrering.prototype.update = function (req, res, next) {
    delete req.body.skabelon;
    req.body.medarbejderkode = req.body.medarbejderkode || req.user.cpr;
    req.body.medarbejdernavn = req.body.medarbejdernavn || req.user.navn;
    req.body.lock = Number(req.body.lock || req.params.lock);
    this.registration.update(req.body, req.params.lock === "0" ? "Timelønnede" : req.params.lock === "1" ? "Sekretær" : req.params.lock === "2" ? "økonom" : "", function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.findOrganizations = function (req,  res, next) {
    Q.all([
        this.registration.getOrganisations(req.params.ssn),
        this.registration.getLkosForJobCategory(req.params.jobkategori)]
        ).spread(function (organizations, lkos) {
        res.json({
            organizations: organizations,
            lkos: lkos
        });
    }, function (error) {
        next(error);
    });
};

Registrering.prototype.findLocations = function (req,  res, next) {
    this.registration.getLocations(req.params.enhed, function (error, locations) {
        if (error) {
            next(error);
        } else {
            res.json(locations);
        }
    });
};

Registrering.prototype.findCombos = function (req,  res, next) {
    this.registration.getForLocation(req.params.sted, function (error, kombo) {
        if (error) {
            next(error);
        } else {
            res.json({
                projects: kombo.projects,
                activities: kombo.activities
            });
        }
    });
};

Registrering.prototype.account = function (req,  res, next) {
    this.registration.getAccounts(req.params.projekt, req.params.aktivitet, function (error, accounts) {
        if (error) {
            next(error);
        } else {
            res.json(accounts);
        }
    });
};

Registrering.prototype.remove = function (req,  res, next) {
    this.registration.deleteRegistration(req.params.id, function (error, success) {
        if (error) {
            next(error);
        } else {
            res.send(success);
        }
    });
};

Registrering.prototype.savePreferences = function (req, res, next) {
    this.registration.savePreferences(req.user.cpr, "Medarbejder", JSON.parse(req.body.data));
};

Registrering.prototype.view = function (req, res, next) {
    var self = this;
    this.registration.getRegistration(req.params.id, req.params.lock === "0" ? "Timelønnede" : "", function (error, registration) {
        if (error) {
            next(error);
        } else {
            if (!registration) {
                res.send(404);
            } else {
                if (req.params.lock === "1") {
                    self.registration.getOrganisationsForRole(req.user.cpr, "Sekretær", function (error, organisations) {
                        if (error) {
                            next(error);
                        } else {
                            self.registration.findEmployeesInOrganizations(organisations, function (error, employees) {
                                if (error) {
                                    next(error);
                                } else {
                                    res.render("registrering/gem", { title: "Registrering", registrering: registration, cpr: registration.medarbejderkode, medarbejdere: employees });
                                }
                            });
                        }
                    });
                } else if (req.params.lock === "2") {
                    res.render("registrering/vis", { title: "Registrering", registrering: registration, lock: 2 });
                } else {
                    res.render("registrering/gem", { title: "Registrering", registrering: registration, cpr: req.params.lock === "0" ? req.user.cpr : req.query.medarbejder });
                }
            }
        }
    });
};

Registrering.prototype.approve = function (req, res, next) {
    var self = this;
    this.registration.getRegistration(req.params.id, "", function (error, registration) {
        if (error) {
            next(error);
        } else {
            delete registration.samtaler;
            registration.lock = Number(req.params.lock);
            self.registration.update(registration, req.params.lock === "0" ? "Timelønnede" : req.params.lock === "1" ? "Sekretær" : req.params.lock === "2" ? "økonom" : "", function (error) {
                if (error) {
                    next(error);
                } else {
                    res.redirect("/registrering/lock/" + req.params.lock);
                }
            });
        }
    });
};

Registrering.prototype.reject = function (req, res, next) {
    var self = this;
    this.registration.getRegistration(req.params.id, "", function (error, registration) {
        if (error) {
            next(error);
        } else {
            delete registration.samtaler;
            registration.lock = -Number(req.params.lock);
            self.registration.update(registration, req.params.lock === "0" ? "Timelønnede" : req.params.lock === "1" ? "Sekretær" : req.params.lock === "2" ? "økonom" : "", function (error) {
                if (error) {
                    next(error);
                } else {
                    res.redirect("/registrering/lock/" + req.params.lock);
                }
            });
        }
    });
};

Registrering.prototype.stat = function (req, res, next) {
    res.render("dashboard", { success: 16, info: 8, danger: 4 });
};

module.exports = Registrering;