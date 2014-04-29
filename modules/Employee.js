var azure = require('azure'),
    Task = require("../modules/Task"),
    Import = require("../modules/Import"),
    task;

module.exports = Employee;

function Employee(tableService, callback) {
    task = new Task(tableService, 'employee', 'employee', 'ssn', callback);
}

Employee.prototype.install = function(callback) {
    var setup = new Import('employee.txt');
    setup.getWords('\t', function (error, words) {
        if (error) {
            callback(error); return;
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
        task.batchEntities(employees, callback);
    });
};

Employee.prototype.all = function (callback) {
    var query = azure.TableQuery.select().from('employee');
    task.queryEntities(query, function (error, entities) {
        callback(error, entities);
    });
};

Employee.prototype.one = function (ssn, callback) {
    task.queryEntity(ssn, function (error, entity) {
        callback(error, entity);
    });
};
