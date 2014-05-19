"use strict";

var util = require("util"),
    moment = require("moment"),
    Q = require("Q"),
    _ = require("underscore"),
    Registration = require("../modules/Registration");

moment.lang("da");

function Godkende(tableService, queueService) {
    this.registration = new Registration(tableService, queueService);
}

Godkende.prototype.index = function (req, res, next) {
    Q.all([this.registration.getOrganisations(), this.registration.getEmployees(), this.registration.peek()]).spread(function (organizations, employees, registrations) {
        res.render("godkende/index", { title: "Sekretær", enheder: organizations, medarbejdere: employees.map(function (employee) { employee.navn = util.format("%s %s", employee.firstName, employee.lastName); return employee; }), registreringer: registrations });
    }, function (error) {
        next(error);
    });
};

Godkende.prototype.approve = function (req, res, next) {
    var queue = [],
        self = this,
        ids = req.body.ids.split(",");
    this.registration.get(function (error, messages) {
        if (error) {
            next(error);
        } else {
            messages.filter(function (message) {
                return ids.indexOf(message.id) > -1;
            }).forEach(function (message) {
                message.lock = Number.MAX_VALUE;
                message.logs = message.logs || [];
                message.logs.push({
                    when: new Date(),
                    name: "Sekretær",
                    what: "Godkendt",
                    text: "",
                    type: "success"
                });
                queue.push(self.registration.update(message));
                Q.all(queue).done(function () {
                    setTimeout(function () {
                        res.redirect("/godkende");
                    }, 1000);
                });
            });
        }
    });
};

Godkende.prototype.reject = function (req, res, next) {
    var queue = [],
        self = this,
        ids = req.body.ids.split(",");
    this.registration.get(function (error, messages) {
        if (error) {
            next(error);
        } else {
            messages.filter(function (message) {
                return ids.indexOf(message.id) > -1;
            }).forEach(function (message) {
                message.godkendelsesstatus = "afvist";
                message.godkendelsesmeddelelsen = req.body.godkendelsesmeddelelsen;
                message.logs = message.logs || [];
                message.logs.push({
                    when: new Date(),
                    name: "Sekretær",
                    what: "Afvist",
                    text: message.godkendelsesmeddelelsen,
                    type: "danger"
                });
                queue.push(self.registration.update(message));
                Q.all(queue).done(function () {
                    setTimeout(function () {
                        res.redirect("/godkende");
                    }, 1000);
                });
            });
        }
    });
};

Godkende.prototype.get = function (req, res, next) {
    var id = req.params.id,
        message = null;
    this.registration.get(function (error, messages) {
        if (error) {
            next(error);
        } else {
            message = _.findWhere(messages, { id: id });
            message.logs = message.logs || [];
            message.logs.forEach(function (log) {
                log.when = moment(log.when).format("DD MMM YYYY HH:mm:ss");
            });
            res.render("godkende/registrering", { title: "Sekretær", registrering: message });
        }
    });
};

module.exports = Godkende;
