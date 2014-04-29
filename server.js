var nconf = require('nconf'),
    azure = require('azure'),
    bodyParser = require('body-parser'),
    path = require('path'),
    express = require('express'),
    apiRouter = express.Router(),
    Api = require('./routes/api'),
    Employee = require('./routes/employee'),
    JobCategory = require('./routes/jobcategory');

var app = express();
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.use(bodyParser());

nconf.file('settings.json').env();

var tableService = azure.createTableService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY'));

var env = process.env.NODE_ENV || '';
if (env === 'setup') {
    var imports = process.argv[2].split(',');
    imports.forEach(function (key) {
        try {
            var module = require(path.join(__dirname, 'modules', key));
            var instance = new module(tableService, function () {
                instance.install(function (errors) {
                    if (errors && errors.length) {
                        errors.forEach(function (error) {
                            console.error(error);
                        });
                    }
                    else
                        console.log('%s setup OK', key);
                });
            });
        }
        catch (error) {
            console.error('%s setup FAIL: %s', key, error);
        }
    });
}

var api = new Api(tableService);

apiRouter.get('/lko', api.lko);
apiRouter.get('/pkat', api.pkat);
apiRouter.get('/sted', api.sted);
apiRouter.get('/stiko', api.stiko);

app.use('/api', apiRouter);

app.get('/job-category-config', JobCategory.index);
app.get('/employee', Employee.index);
app.post('/employee', Employee.search);
app.get('/employee/:ssn', Employee.get);
app.get('/employee/new', Employee.get);

app.listen(process.env.PORT || 8192);



