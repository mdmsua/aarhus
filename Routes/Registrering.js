"use strict";

var Q = require("Q"),
    _ = require("underscore"),
    Registration = require("../modules/Registration");

function Registrering(tableService, queueService) {
    this.registration = new Registration(tableService, queueService);
}

Registrering.prototype.index = function (req,  res, next) {
    Q.all([this.registration.peek()]).spread(function (registrations) {
        res.render("registrering/index", { title: "Registrering", registreringer: registrations });
    });
};

Registrering.prototype.create = function (req,  res, next) {
    Q.all([this.registration.create(), this.registration.getDrafts(), this.registration.getTemplates()]).spread(function (projects, drafts, templates) {
        res.render("registrering/ny", { title: "Registrering", projekter: projects, kladder: drafts || [], skabeloner: templates || [] });
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

Registrering.prototype.activity = function (req,  res, next) {
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
    this.registration.post(req.body, function (error) {
        if (error) {
            next(error);
        } else {
            res.redirect("/registrering");
        }
    });
};

module.exports = Registrering;