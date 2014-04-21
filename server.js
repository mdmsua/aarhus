var nconf = require('nconf'),
    azure = require('azure'),
    Task = require('./modules/Task'),
    Stiko = require('./routes/Stiko'),
    Pkat = require('./routes/Pkat'),
    Lko = require('./routes/Lko'),
    History = require('./routes/History'),
    JobCategory = require('./routes/JobCategory'),
    express = require('express');

var app = express();
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));

nconf.file('settings.json').env();

var tableService = azure.createTableService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY'));

var env = process.env.NODE_ENV || '';
if (env === 'import') {
    var Import = require('./modules/Import');
    var setup = new Import(tableService);
    setup.stiko();
    setup.pkat();
    setup.lko();
}

var stiko = new Stiko(new Task(tableService, 'stiko', 'stiko'));
var pkat = new Pkat(new Task(tableService, 'pkat', 'pkat'));
var lko = new Lko(new Task(tableService, 'lko', 'lko'));
var history = new History();
var jobcategory = new JobCategory();

app.get('/job-category-config', jobcategory.index);
app.get('/api/stiko', stiko.get);
app.get('/api/pkat', pkat.get);
app.get('/api/lko', lko.get);
app.get('/api/history', history.get);

app.listen(process.env.PORT || 8192);



