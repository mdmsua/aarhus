var nconf = require('nconf'),
    azure = require('azure'),
    bodyParser = require('body-parser'),
    Api = require('./Routes/Api'),
    JobCategory = require('./Routes/JobCategory'),
    Employee = require('./Routes/Employee'),
    express = require('express'),
    apiRouter = express.Router();

var app = express();
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.use(bodyParser());

nconf.file('settings.json').env();

var tableService = azure.createTableService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY'));

var env = process.env.NODE_ENV || '';
if (env === 'import') {
    var Import = require('./modules/Import');
    var setup = new Import(tableService);
    setup.stiko();
    setup.pkat();
    setup.lko();
    setup.sted();
}

var api = new Api(tableService);

apiRouter.get('/lko', api.lko);
apiRouter.get('/pkat', api.pkat);
apiRouter.get('/stiko', api.stiko);
apiRouter.get('/history', api.history);

app.use('/api', apiRouter);

app.get('/job-category-config', JobCategory.index);
app.get('/employee', Employee.index);
app.post('/employee', Employee.search);
app.get('/employee/:ssn', Employee.get);
app.get('/employee/new', Employee.get);

app.listen(process.env.PORT || 8192);



