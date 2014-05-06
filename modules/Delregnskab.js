"use strict";

var util = require('util'),
    KodeNavn = require("../modules/KodeNavn");

function Delregnskab(tableService) {
    KodeNavn.call(this, tableService, 'delregnskab');
}

util.inherits(Delregnskab, KodeNavn);

module.exports = Delregnskab;