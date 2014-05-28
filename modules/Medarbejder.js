"use strict";

var util = require("util"),
    Q = require("Q"),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    table = "medarbejder";

function Medarbejder(tableService, callback) {
    this.task = new Task(tableService, table, table, "cpr", callback);
}

Medarbejder.prototype.install = function (callback) {
    var self = this,
        setup = new Import("medarbejder.txt");
    setup.getWords("\t", function (error, words) {
        if (error) {
            callback(error);
            return;
        }
        var employees = words.map(function (word) {
            return {
                cpr: (word[0] || "").trim(),
                fornavn: (word[1] || "").trim(),
                efternavn: (word[2] || "").trim(),
                initialer: (word[3] || "").trim(),
                email: (word[4] || "").trim(),
                telefon: (word[5] || "").trim(),
                projekt: Number((word[6] || "").trim()),
                altivitet: Number((word[7] || "").trim()),
                delregnskab: Number((word[8] || "").trim()),
                sted: Number((word[9] || "").trim()),
                stilling: Number((word[10] || "").trim()),
                dato: new Date((word[11] || "").trim())
            };
        });
        self.task.batchEntities(employees, callback);
    });
};

Medarbejder.prototype.all = function (callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ? { table: table } : require("azure").TableQuery.select().from(table);
    this.task.queryEntities(query, function (error, entities) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entities);
        }
    });
    return deferred.promise.nodeify(callback);
};

Medarbejder.prototype.one = function (ssn, callback) {
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

Medarbejder.prototype.getByInitials = function (initials, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { initialer: initials } } :
                require("azure").TableQuery.select().from(table).where("initialer eq ?", initials);
    this.task.queryEntities(query, function (error, employees) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(employees.length === 1 ? employees[0] : null);
        }
    });
    return deferred.promise.nodeify(callback);
};

Medarbejder.prototype.save = function (employee, callback) {
    var deferred = Q.defer();
    employee.roller = (util.isArray(employee.roller) ? employee.roller : [employee.roller]).join();
    employee.enheder = (util.isArray(employee.enheder) ? employee.enheder : [employee.enheder]).join();
    this.task.insertOrReplaceEntity(employee, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(entity);
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Medarbejder;
