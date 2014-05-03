"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function SalaryForm(tableService) {
    KodeNavn.call(this, tableService, 'salary-form');
}

util.inherits(SalaryForm, KodeNavn);

module.exports = SalaryForm;