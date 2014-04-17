module.exports = History;

var moment = require('moment');

function History() {
}

History.prototype.get = function (req, res) {
    var data = [];
    for (var i = 0; i < 12; i++) {
        var date = Number(new Date(Number((Math.random() * 1e12).toFixed())));
        data.push({
            period: moment(new Date(date) - 1e11).format("MMMM YYYY") + ' - ' + moment(date).format("MMMM YYYY"),
            values: [
                {
                    key: 'LKO',
                    value: (i + 1) * 10
                },
                {
                    key: 'PKAT',
                    value: (i + 2) * 10
                },
                {
                    key: 'STIKO',
                    value: (i + 3) * 10
                },
                {
                    key: 'Salary class',
                    value: (i + 1)
                },
                {
                    key: 'Salary form',
                    value: (i + 2)
                },
                {
                    key: 'Salary level',
                    value: (i + 3)
                }
            ]
        });
    }
    res.send(data);
};