"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Stiko(tableService) {
    KodeNavn.call(this, tableService, 'stiko');
}

util.inherits(Stiko, KodeNavn);

module.exports = Stiko;