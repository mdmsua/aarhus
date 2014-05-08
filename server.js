"use strict";
var bodyParser = require('body-parser'),
    path = require('path'),
    express = require('express'),
    JobCategoryConfig = require('./routes/jobcategoryconfig'),
    Employee = require('./routes/employee'),
    index = require('./routes/index'),
    app = express(),
    tableService = null;

function development(callback) {
    var MongoClient = require('mongodb').MongoClient,
        MongoService = require('./modules/MongoService');

    MongoClient.connect("mongodb://localhost:27017/aarhus", function (error, db) {
        if (error) {
            throw error;
        }
        tableService = new MongoService(db);
        callback(tableService);
    });
}

function production(callback) {
    var nconf = require('nconf'),
        azure = require('azure');
    nconf.file('settings.json').env();
    tableService = azure.createTableService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY'));
    callback(tableService);
}

function setup() {
    var imports = (process.argv[2] || '').split(',');
    imports.forEach(function (key) {
        if (key) {
            try {
                console.log("Installing %s", key);
                var Module = require(path.join(__dirname, 'modules', key)),
                    instance = new Module(tableService);
                console.log("Ready to setup %s", key);
                instance.install(function (errors) {
                    if (errors && errors.length) {
                        errors.forEach(function (error) {
                            console.error(error);
                        });
                    } else {
                        console.log('%s setup OK', key);
                    }
                });
            } catch (error) {
                console.error('%s setup FAIL: %s', key, error);
            }
        }
    });
}

app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.use(express.static(__dirname + '/bower_components/bootstrap'));
app.use(bodyParser());

var employeeRouter = express.Router();
var jobCategoryConfigRouter = express.Router();

app.use('/job-category-config', jobCategoryConfigRouter);
app.use('/jobkategori', jobCategoryConfigRouter);
app.use('/employee', employeeRouter);
app.use('/medarbejder', employeeRouter);

var env = process.env.NODE_ENV || '',
    fn = env === 'dev' ? development : production;

fn(function () {
    setup();
    var jobCategoryConfig = new JobCategoryConfig(tableService),
        employee = new Employee(tableService);
    app.get('/', index.index);
    jobCategoryConfigRouter.get('/', jobCategoryConfig.index.bind(jobCategoryConfig));
    jobCategoryConfigRouter.get('/:uuid', jobCategoryConfig.get.bind(jobCategoryConfig));
    jobCategoryConfigRouter.get('/:id/detail', jobCategoryConfig.detail.bind(jobCategoryConfig));
    jobCategoryConfigRouter.get('/:uuid/detail/:id', jobCategoryConfig.detail.bind(jobCategoryConfig));
    employeeRouter
        .get('/', employee.index.bind(employee))
        .post('/', employee.search.bind(employee))
        .get('/new', employee.create.bind(employee))
        .get('/organisations', employee.organisations.bind(employee))
        .get('/:ssn', employee.get.bind(employee))
        .get('/config/:uuid', employee.config.bind(employee));
    app.listen(process.env.PORT || 8192);
});