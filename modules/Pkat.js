"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Pkat(tableService) {
    KodeNavn.call(this, tableService, 'pkat');
}

util.inherits(Pkat, KodeNavn);

module.exports = Pkat;