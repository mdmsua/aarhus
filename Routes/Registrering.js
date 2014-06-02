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
    var period = parseInt(req.params.period, 10) || 0;
    Q.all([
        this.registration.get(0, period, req.user),
        this.registration.getJobCategories(req.params.ssn || req.user.cpr),
        this.registration.getOrganisations(req.params.ssn || req.user.cpr),
        this.registration.getPreferences(req.user.cpr, "Medarbejder")
    ]).spread(function (registrations, jobCategories, organisations, preferences) {
        res.render("registrering/index", {
            title: "Registrering",
            registreringer: registrations,
            jobkategorier: jobCategories,
            enheder: organisations,
            indstillinger: JSON.stringify(preferences),
            period: period
        });
    });
};

Registrering.prototype.create = function (req,  res) {
    var jobkategori = req.query.jobkategori,
        enhed = req.query.enhed;
    res.render("registrering/ny", { title: "Registrering", jobkategorikode: jobkategori, enhedkode: enhed, dato: moment().format("DD-MM-YYYY") });
};

Registrering.prototype.getJobCategories = function (req,  res, next) {
    this.registration.getJobCategories(req.params.ssn || req.user.cpr, function (error, jobCategories) {
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
    req.body.lock = 0;
    this.registration.create(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.update = function (req, res, next) {
    res.send(req.body);
    return;
    delete req.body.skabelon;
    req.body.medarbejderkode = req.body.medarbejderkode || req.user.cpr;
    req.body.medarbejdernavn = req.body.medarbejdernavn || req.user.navn;
    req.body.lock = 0;
    this.registration.create(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

Registrering.prototype.findOrganizations = function (req,  res, next) {
    Q.all([
        this.registration.getOrganisations(req.params.ssn || req.user.cpr),
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

Registrering.prototype.forOrganization = function (req,  res, next) {
    this.registration.getLocations(req.params.enhed, function (error, locations) {
        if (error) {
            next(error);
        } else {
            res.json(locations);
        }
    });
};

Registrering.prototype.forLocation = function (req,  res, next) {
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
    this.registration.remove(req.params.id, function (error, success) {
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
    this.registration.getRegistration(req.params.id, "Medarbejder", function (error, registration) {
        if (error) {
            next(error);
        } else {
            if (!registration) {
                res.send(404);
            } else {
                res.render("registrering/vis", { title: "Registrering", registrering: registration });
            }
        }
    });
};

module.exports = Registrering;