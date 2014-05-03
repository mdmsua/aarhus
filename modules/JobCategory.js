"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function JobCategory(tableService) {
    KodeNavn.call(this, tableService, 'job-category');
}

util.inherits(JobCategory, KodeNavn);

module.exports = JobCategory;