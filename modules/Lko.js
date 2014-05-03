"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Lko(tableService) {
    KodeNavn.call(this, tableService, 'lko');
}

util.inherits(Lko, KodeNavn);

module.exports = Lko;