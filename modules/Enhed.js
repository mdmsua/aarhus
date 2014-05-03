"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Enhed(tableService) {
    KodeNavn.call(this, tableService, 'enhed');
}

util.inherits(Enhed, KodeNavn);

module.exports = Enhed;