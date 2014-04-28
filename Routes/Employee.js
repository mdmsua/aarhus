exports.index = function (req, res) {
    res.render('employee');
};

exports.search = function (req, res) {
    if (req.body.q)
        res.render('employee', { employees: [
            {
                ssn: '0123456789',
                name: 'John Smith'
            },
            {
                ssn: '1123456789',
                name: 'Josh Smith'
            },
            {
                ssn: '2123456789',
                name: 'Jude Smith'
            }
        ]});
    else res.render('employee');
};

exports.get = function (req, res) {
    res.render('employee', { employee: { ssn: req.params.ssn } });
};