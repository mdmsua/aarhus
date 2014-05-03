"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Sted(tableService) {
    KodeNavn.call(this, tableService, 'sted');
}

util.inherits(Sted, KodeNavn);

module.exports = Sted;