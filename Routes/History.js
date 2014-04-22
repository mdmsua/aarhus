module.exports = History;

var moment = require('moment'),
    Task = require('../modules/Task'),
    tableService;

function History(_tableService) {
    tableService = _tableService;
}

History.prototype.get = function (req, res) {
    var data = [],
        dates = [],
        lkos = [],
        pkats = [],
        stikos = [],
        length = 12;
    for (var i = 0; i < length; i++) {
        dates.push(Number(new Date(Number((Math.random() * 1e12 + 1e11).toFixed()))));
    }
//    new Task(tableService, 'pkat', 'pkat').queryEntities(azure.TableQuery.select().from('pkat').top(length), function(error, entities) {
//        entities.forEach(function (entity) {
//            pkats.push(entity);
//        });
//    });
    dates.sort();
    for (var i = 0; i < length; i++) {
        data.push({
            period: moment(new Date(dates[i])).format("MMMM YYYY") + ' - ' + moment(i === (length - 1) ? new Date() : new Date(dates[i + 1])).format("MMMM YYYY")
//            values: [
//                {
//                    key: 'LKO',
//                    value: (i + 1) * 10
//                },
//                {
//                    key: 'PKAT',
//                    value: (i + 2) * 10
//                },
//                {
//                    key: 'STIKO',
//                    value: (i + 3) * 10
//                },
//                {
//                    key: 'Salary class',
//                    value: (i + 1)
//                },
//                {
//                    key: 'Salary form',
//                    value: (i + 2)
//                },
//                {
//                    key: 'Salary level',
//                    value: (i + 3)
//                }
//            ]
        });
    }
    res.send(data.reverse());
};