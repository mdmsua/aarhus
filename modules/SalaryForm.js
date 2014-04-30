var Q = require('Q'),
    azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = SalaryForm;

function SalaryForm(tableService, callback) {
    task = new Task(tableService, 'kodenavn', 'salary-form', 'kode', callback);
}

SalaryForm.prototype.install = function (callback) {
    var setup = new Import('salaryForm.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var salaryForms = words.map(function (word) {
            return {
                kode: (word[0] || '').trim(),
                navn: (word[1] || '').trim()
            };
        });
        task.batchEntities(salaryForms, callback);
    });
};

SalaryForm.prototype.all = function (callback) {
    var deferred = Q.defer();
    var query = azure.TableQuery.select().from('kodenavn').where('PartitionKey eq ?', 'salary-form');
    task.queryEntities(query, function (error, entities) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entities);
    });
    return deferred.promise.nodeify(callback);
};

SalaryForm.prototype.one = function (salaryForm, callback) {
    var deferred = Q.defer();
    task.queryEntity(salaryForm, function (error, entity) {
        if (error)
            deferred.reject(error);
        else
            deferred.resolve(entity);
    });
    return deferred.promise.nodeify(callback);
};
