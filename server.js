"use strict";
var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    methodOverride = require('method-override'),
    path = require('path'),
    express = require('express'),
    JobCategoryConfig = require('./routes/jobcategoryconfig'),
    Employee = require('./routes/employee'),
    Registrering = require('./routes/Registrering'),
    index = require('./routes/index'),
    app = express(),
    tableService = null,
    queueService = null;

function development(callback) {
    var MongoClient = require('mongodb').MongoClient,
        MongoService = require('./modules/MongoService');

    MongoClient.connect("mongodb://localhost:27017/aarhus", function (error, db) {
        if (error) {
            throw error;
        }
        tableService = new MongoService(db);
//        var filter = {
//            handle: function (requestOptions, next) {
//                if (next) {
//                    next(requestOptions, function (returnObject, finalCallback, nextPostCallback) {
//                        if (returnObject.queueMessageResults) {
//                            returnObject.queueMessageResults = returnObject.queueMessageResults.filter(function (queueMessageResult) {
//                                return !!queueMessageResult.messagetext;
//                            });
//                        }
//                        if (nextPostCallback) {
//                            nextPostCallback(returnObject);
//                        } else if (finalCallback) {
//                            finalCallback(returnObject);
//                        }
//                    });
//                }
//            }
//        };
        callback();
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
app.use(cookieParser());
app.use(session({ secret: "Try2gue$$" }));
app.use(methodOverride());

var employeeRouter = express.Router(),
    jobCategoryConfigRouter = express.Router(),
    registrationRouter = express.Router();

app.use('/job-category-config', jobCategoryConfigRouter);
app.use('/jobkategori', jobCategoryConfigRouter);
app.use('/employee', employeeRouter);
app.use('/medarbejder', employeeRouter);
app.use('/registrering', registrationRouter);

var env = process.env.NODE_ENV || '',
    fn = env === 'dev' ? development : production;

fn(function () {
    setup();
    var nconf = require('nconf'),
        azure = require('azure'),
        jobCategoryConfig,
        employee,
        registration;
    nconf.file('settings.json').env();
    queueService = azure.createQueueService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY'));
    jobCategoryConfig = new JobCategoryConfig(tableService);
    employee = new Employee(tableService);
    registration = new Registrering(tableService, queueService);
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
    registrationRouter
        .get('/', registration.index.bind(registration))
        .get('/ny', registration.create.bind(registration))
        .get('/projekt/:kode', registration.project.bind(registration))
        .get('/aktivitet/:projekt/:kode', registration.activity.bind(registration))
        .post('/kladde', registration.saveDraft.bind(registration))
        //.post('/kladde/:id', registration.deleteDraft.bind(registration))
        .post('/skabelon', registration.saveTemplate.bind(registration))
        //.post('/skabelon/:id', registration.deleteTemplate.bind(registration))
        .post('/ny', registration.send.bind(registration));
        //.get('/kladde/:id', registration.draft.bind(registration))
        //.get('/skabelon/:id', registration.template.bind(registration));
    app.listen(process.env.PORT || 8192);
});