module.exports = History;

var moment = require('moment');

function History() {
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
    dates.sort();
    for (var i = 0; i < length; i++) {
        data.push({
            period: moment(new Date(dates[i])).format("MMMM YYYY") + ' - ' + moment(i === (length - 1) ? new Date() : new Date(dates[i + 1])).format("MMMM YYYY")
        });
    }
    res.send(data.reverse());
};