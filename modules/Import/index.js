module.exports = Import;

var Task = require('../Task'),
    fs = require('fs');

function Import(tableService) {
    this.tableService = tableService;
    this.getWords = function (file, callback) {
        fs.readFile(__dirname + '/' + file, function (error, data) {
            if (error) callback(error);
            data.toString().split('\n').forEach(function (line) {
                var words = line.split('\t');
                callback(null, words);
            });
        });
    }
}

Import.prototype.stiko = function () {
    var self = this;
    var task = new Task(self.tableService, 'stiko', 'stiko');
    self.getWords('stiko.txt', function (error, words) {
        if (error) throw error;
        var length = words.length;
        var entity = {
            nummer: length > 0 ? words[0] : '',
            stilling: length > 1 ? words[1] : '',
            yderligere_oplysninger: length > 2 ? words[2] : ''
        };
        task.insertEntity(entity, 'nummer', function () {
            console.log('STIKO ' + entity.nummer + ': ' + entity.stilling);
        });
    });
};

Import.prototype.pkat = function () {
    var self = this;
    var task = new Task(self.tableService, 'pkat', 'pkat');
    self.getWords('pkat.txt', function (error, words) {
        if (error) throw error;
        var length = words.length;
        var entity = {
            nummer: length > 0 ? words[0] : '',
            navn: length > 1 ? words[1] : '',
            hovedgruppe: length > 2 ? words[2] : '',
            forh_fællesskabskode: length > 3 ? words[3] : '',
            faglig_organisation: length > 4 ? words[4] : ''
        };
        task.insertEntity(entity, 'nummer', function () {
            console.log('PKAT ' + entity.nummer + ': ' + entity.navn);
        });
    });
};

Import.prototype.lko = function () {
    var self = this;
    var task = new Task(self.tableService, 'lko', 'lko');
    self.getWords('lko.txt', function (error, words) {
        if (error) throw error;
        var length = words.length;
        var entity = {
            kode: length > 0 ? words[0] : '',
            navn: length > 1 ? words[1] : '',
            arts_konto: length > 2 ? words[2] : '',
            løndels_type: length > 3 ? words[3] : '',
            løndelsart: length > 4 ? words[4] : '',
            pensionsgivende: length > 5 ? words[5] : ''
        };
        task.insertEntity(entity, 'kode', function () {
            console.log('LKO ' + entity.kode + ': ' + entity.navn);
        });
    });
};

Import.prototype.sted = function (callback) {
    var self = this;
    var task = new Task(self.tableService, 'sted', 'sted', function (error) {
        if (error) callback(error);
        fs.readFile(__dirname + '/sted.txt', function (error, data) {
            if (error) callback(error);
            data.toString().split('\n').forEach(function (line) {
                var code = Number(line.slice(0, 4));
                var name = line.slice(5).trim();
                if (/^\d{4}/.test(name)) {
                    name = name.slice(5).trim();
                }
                var entity = {
                    kode: code,
                    navn: name
                };
                task.insertEntity(entity, 'kode', function (error, entity) {
                    if (error)
                        console.error(error);
                    else
                        console.log('STED %d: %s', entity.kode, entity.navn);
                });
            });
        });
    });
};