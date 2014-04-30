var Q = require("Q"),
    _ = require("underscore"),
    moment = require('moment'),
    JobCategoryConfigModule = require("../modules/JobCategoryConfig"),
    Stiko = require("../modules/Stiko"),
    Pkat = require("../modules/Pkat"),
    Lko = require("../modules/Lko"),
    JobCategory = require("../modules/JobCategory"),
    SalaryForm = require("../modules/SalaryForm");

module.exports = JobCategoryConfig;

moment.lang('da');

function JobCategoryConfig(tableService) {
    this.jobCategoryConfig = new JobCategoryConfigModule(tableService);
    this.stiko = new Stiko(tableService);
    this.pkat = new Pkat(tableService);
    this.lko = new Lko(tableService);
    this.jobCategory = new JobCategory(tableService);
    this.salaryForm = new SalaryForm(tableService);
}

JobCategoryConfig.prototype.index = function (req, res) {
    this.jobCategoryConfig.all(function (error, configurations) {
        res.render('jobCategoryConfig', { configurations: configurations });
    });
};

JobCategoryConfig.prototype.get = function (req, res) {
    var self = this;
    self.jobCategoryConfig.one(req.params.uuid, function (error, config) {
        Q.all([
            self.lko.one(config.lko),
            self.pkat.one(config.pkat),
            self.stiko.one(config.stiko),
            self.jobCategory.one(config.st),
            self.salaryForm.one(((Math.random() * 10).toFixed()) % 6 + 1),
            self.jobCategoryConfig.all()]).spread(function (lko, pkat, stiko, stilling, salaryForm, configurations) {
            res.render("jobCategoryConfig", {
                configuration: config,
                configurations: configurations,
                details: [
                    {
                        period: moment().startOf("year").format("D MMMM YYYY") + " - ",
                        lko: lko.kode + ": " + lko.navn,
                        pkat: pkat.kode + ": " + pkat.navn,
                        stiko: stiko.kode + ": " + stiko.navn,
                        stilling: stilling.kode + ": " + stilling.navn,
                        salaryForm: salaryForm.kode + ": " + salaryForm.navn,
                        salaryClass: 1,
                        salaryLevel: 2
                    }
                ]
            });
        });
    });
};

JobCategoryConfig.prototype.detail = function (req, res) {
    var self = this;
    self.jobCategoryConfig.one(req.params.uuid || NaN, function (error, config) {
        Q.all([
            self.lko.all(),
            self.pkat.all(),
            self.stiko.all(),
            self.jobCategory.all(),
            self.salaryForm.all()]).spread(function (lkos, pkats, stikos, stillings, salaryForms) {
            res.render("jobCategoryConfigDetail", {
                configuration: config,
                lkos: lkos,
                pkats: pkats,
                stikos: stikos,
                stillings: stillings,
                salaryForms: salaryForms,
                salaryClasses: Array.apply(null, Array(100)).map(function (_, i) {if (i > 0) return i;}),
                salaryLevels: Array.apply(null, Array(56)).map(function (_, i) {if (i > 0) return i;})
            });
        });
    });
};