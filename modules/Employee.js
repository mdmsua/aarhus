"use strict";

var Q = require('Q'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import");

function Employee(tableService, callback) {
    this.task = new Task(tableService, 'employee', 'employee', 'ssn', callback);
}

Employee.prototype.install = function (callback) {
    var self = this,
        setup = new Import('employee.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var employees = words.map(function (word) {
            return {
                ssn: (word[0] || '').trim(),
                firstName: (word[1] || '').trim(),
                lastName: (word[2] || '').trim(),
                initials: (word[3] || '').trim(),
                email: (word[4] || '').trim(),
                phone: (word[5] || '').trim(),
                project: Number((word[6] || '').trim()),
                activity: Number((word[7] || '').trim()),
                account: Number((word[8] || '').trim()),
                location: Number((word[9] || '').trim()),
                jobCategory: Number((word[10] || '').trim()),
                date: new Date((word[11] || '').trim())
            };
        });
        self.task.batchEntities(employees, callback);
    });
};

Employee.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === 'dev' ? null : require('azure').TableQuery.select().from('employee');
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

Employee.prototype.one = function (ssn, callback) {
    var deferred = Q.defer();
    this.task.queryEntity(ssn, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entity);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Employee;
