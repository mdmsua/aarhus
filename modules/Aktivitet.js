"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Aktivitet(tableService) {
    KodeNavn.call(this, tableService, 'aktivitet');
}

util.inherits(Aktivitet, KodeNavn);

module.exports = Aktivitet;