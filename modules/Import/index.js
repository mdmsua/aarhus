"use strict";

var fs = require('fs'),
    path = require('path');

function Import(file) {
    this.file = file;
}

Import.prototype.getWords = function (delimiter, callback) {
    var self = this;
    fs.readFile(path.join(__dirname, self.file), function (error, data) {
        if (error) {
            callback(error);
            return;
        }
        var words = [];
        data.toString().split('\n').forEach(function (line) {
            words.push(line.split(delimiter));
        });
        callback(null, words);
    });
};

Import.prototype.getLines = function (callback) {
    var self = this;
    fs.readFile(path.join(__dirname, self.file), function (error, data) {
        if (error) { callback(error); return; }
        var lines = [];
        data.toString().split('\n').forEach(function (line) {
            var code = Number(line.slice(0, 4)),
                name = line.slice(5);
            if (/^\d{4}/.test(name)) {
                name = name.slice(5);
            }
            lines.push([code, name]);
        });
        callback(null, lines);
    });
};

module.exports = Import;