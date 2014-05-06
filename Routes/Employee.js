"use strict";

var util = require("util"),
    Q = require("Q"),
    EmployeeService = require("../modules/Employee"),
    JobCategoryConfig = require("../modules/JobCategoryConfig"),
    Pkat = require("../modules/Pkat"),
    Stiko = require("../modules/Stiko"),
    Lko = require("../modules/Lko"),
    JobCategory = require("../modules/JobCategory"),
    SalaryForm = require("../modules/SalaryForm");

function Employee(tableService) {
    this.employee = new EmployeeService(tableService);
    this.jobCategoryConfig = new JobCategoryConfig(tableService);
    this.pkat = new Pkat(tableService);
    this.stiko = new Stiko(tableService);
    this.lko = new Lko(tableService);
    this.jobCategory = new JobCategory(tableService);
    this.salaryForm = new SalaryForm(tableService);
}

Employee.prototype.index = function (req, res) {
    res.render("employee/index", { title: "Medarbejder" });
};

Employee.prototype.search = function (req, res) {
    this.employee.all(function (error, employees) {
        if (error) {
            throw error;
        } else {
            var regexp = new RegExp(req.body.q, "gi"),
                results = employees.filter(function (employee) {
                    return regexp.test(employee.ssn.concat(employee.firstName, employee.lastName));
                }).map(function (employee) {
                    employee.name = util.format("%s %s (%s)", employee.firstName, employee.lastName, employee.ssn);
                    return employee;
                });
            if (results.length === 1) {
                res.redirect("/employee/".concat(results[0].ssn));
            } else {
                res.render("employee", { title: "Medarbejder", employees: results });
            }
        }
    });
};

Employee.prototype.get = function (req, res, next) {
    this.employee.one(req.params.ssn, function (error, employee) {
        if (error) {
            next(error);
        } else {
            employee.name = util.format("%s %s (%s)", employee.firstName, employee.lastName, employee.ssn);
            employee.jobkategorier = [
                {
                    dato: "01-01.2013 - 01.01.2014",
                    jobkategori: "Undervisningsassistent cand. I-III",
                    pkat: "Timelønnede",
                    enheder: [
                        {
                            dato: "01-01-2013 - 01-01-2014",
                            enhed: "Smerteforskningscenter, Dansk",
                            stedkode: "AR Arts",
                            delregnskab: "Almindelig virksomhed, AU",
                            projekt: "EDB drift inkl KLIPS OI",
                            aktivitet: "VIP"
                        }
                    ]
                },
                {
                    dato: "01.01.2014 - 01.05.2014",
                    jobkategori: "Undervisningsassistent studerende (disp.)",
                    pkat: "Administrationschef",
                    enheder: [
                        {
                            dato: "01.01.2014 - 01.03.2014",
                            enhed: "Journalistiske Univ.udd., Cent.f.",
                            stedkode: "AR Fælles",
                            delregnskab: "Kommerciel indtægtsdækket virksomhed, AU",
                            projekt: "Retsondontologi Odont Inst",
                            aktivitet: "Post.doc./adj./forsker"
                        },
                        {
                            dato: "01.03.2014 - 01.05.2014",
                            enhed: "Sundhedstjenesteforskning",
                            stedkode: "AR Fælles - drift",
                            delregnskab: "Retsmedicinske undersøgelser, AU",
                            projekt: "Ord midl Oral Epidi Folkesundhed",
                            aktivitet: "PhD"
                        }
                    ]
                }
            ];
            res.render("employee/info", { title: "Medarbejder", employee: employee });
        }
    });
};

Employee.prototype.create = function (req, res) {
    this.jobCategoryConfig.all(function (error, jobCategoryConfigs) {
        res.render("employee/create", { title: "Medarbejder", jobCategoryConfigs: jobCategoryConfigs });
    });
};

Employee.prototype.config = function (req, res, next) {
    var self = this;
    this.jobCategoryConfig.one(req.params.uuid, function (error, config) {
        if (error) {
            next(error);
        } else {
            Q.all([
                self.lko.one(config.lko),
                self.pkat.one(config.pkat),
                self.stiko.one(config.stiko),
                self.jobCategory.one(config.st),
                self.salaryForm.one(new Date().getDate() % 5)]).spread(function (lko, pkat, stiko, stilling, salaryForm) {
                var pkats = [pkat].map(function (pkat) {
                    return {
                        id: pkat.kode,
                        text: pkat.navn
                    };
                });
                res.json({
                    pkats: pkats,
                    lko: lko.kode + ": " + lko.navn,
                    stiko: stiko.kode + ": " + stiko.navn,
                    stilling: stilling.kode + ": " + stilling.navn,
                    salaryForm: salaryForm.kode + ": " + salaryForm.navn,
                    salaryClass: new Date().getMonth() + 1,
                    salaryLevel: new Date().getMonth() + 1
                });
            });
        }
    });
};

module.exports = Employee;