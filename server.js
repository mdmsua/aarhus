var nconf = require('nconf'),
    azure = require('azure'),
    bodyParser = require('body-parser'),
    path = require('path'),
    express = require('express'),
    JobCategoryConfig = require('./routes/jobcategoryconfig');

var app = express();
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.use(express.static(__dirname + '/bower_components/bootstrap'));
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

var jobCategoryConfig = new JobCategoryConfig(tableService);

app.get('/job-category-config', jobCategoryConfig.index.bind(jobCategoryConfig));
app.get('/job-category-config/:uuid', jobCategoryConfig.get.bind(jobCategoryConfig));
app.get('/job-category-config/:id/detail', jobCategoryConfig.detail.bind(jobCategoryConfig));
app.get('/job-category-config/:uuid/detail/:id', jobCategoryConfig.detail.bind(jobCategoryConfig));

app.listen(process.env.PORT || 8192);



