"use strict";
var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    methodOverride = require('method-override'),
    favicon = require('serve-favicon'),
    morgan = require("morgan"),
    path = require('path'),
    express = require('express'),
    JobCategoryConfig = require('./routes/jobcategoryconfig'),
    Employee = require('./routes/employee'),
    Registrering = require('./routes/Registrering'),
    Godkende = require('./routes/Godkende'),
    index = require('./routes/index'),
    app = express(),
    tableService = null,
    employeeQueueService = null,
    approverQueueService = null;

function development(callback) {
    var MongoClient = require('mongodb').MongoClient,
        MongoService = require('./modules/MongoService');

    MongoClient.connect("mongodb://localhost:27017/aarhus", function (error, db) {
        if (error) {
            throw error;
        }
        tableService = new MongoService(db);
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

function getFilter(role) {
    return {
        handle: function (requestOptions, next) {
            if (next) {
                next(requestOptions, function (returnObject, finalCallback, nextPostCallback) {
                    if (returnObject.queueMessageResults) {
                        returnObject.queueMessageResults = returnObject.queueMessageResults.filter(function (queueMessageResult) {
                            try {
                                var message = JSON.parse(queueMessageResult.messagetext);
                                switch (role) {
                                case "godkende":
                                    return !message.lock || message.lock === Number.MIN_VALUE;
                                case "kontrollere":
                                    return message.lock === Number.MAX_VALUE;
                                default:
                                    return !message.lock;
                                }
                            } catch (error) {
                                if (error) {
                                    throw error;
                                }
                            }
                        }).map(function (queueMessageResult) {
                            var message = JSON.parse(queueMessageResult.messagetext);
                            message.id = queueMessageResult.messageid;
                            message.popreceipt = queueMessageResult.popreceipt;
                            queueMessageResult.messagetext = JSON.stringify(message);
                            return queueMessageResult;
                        });
                    }
                    if (nextPostCallback) {
                        nextPostCallback(returnObject);
                    } else if (finalCallback) {
                        finalCallback(returnObject);
                    }
                });
            }
        }
    };
}

app.set('view engine', 'jade');
app.use(favicon(path.join(__dirname, "public/favicon.ico")));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.use(express.static(__dirname + '/bower_components/bootstrap'));
app.use(bodyParser());
app.use(cookieParser());
app.use(session({ secret: "Try2gue$$" }));
app.use(methodOverride());
app.use(morgan("dev"));

var employeeRouter = express.Router(),
    jobCategoryConfigRouter = express.Router(),
    registrationRouter = express.Router(),
    approveRouter = express.Router();

app.use('/job-category-config', jobCategoryConfigRouter);
app.use('/jobkategori', jobCategoryConfigRouter);
app.use('/employee', employeeRouter);
app.use('/medarbejder', employeeRouter);
app.use('/registrering', registrationRouter);
app.use('/godkende', approveRouter);

var env = process.env.NODE_ENV || '',
    fn = env === 'dev' ? development : production;

fn(function () {
    setup();
    var nconf = require('nconf'),
        azure = require('azure'),
        jobCategoryConfig,
        employee,
        registration,
        approve;
    nconf.file('settings.json').env();
    employeeQueueService = azure.createQueueService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY')).withFilter(getFilter());
    approverQueueService = azure.createQueueService(nconf.get('AZURE_STORAGE_ACCOUNT'), nconf.get('AZURE_STORAGE_ACCESS_KEY')).withFilter(getFilter("godkende"));
    jobCategoryConfig = new JobCategoryConfig(tableService);
    employee = new Employee(tableService);
    registration = new Registrering(tableService, employeeQueueService);
    approve = new Godkende(tableService, approverQueueService);
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
        .get('/sted/:sted', registration.forLocation.bind(registration))
        .post('/kladde', registration.saveDraft.bind(registration))
        .get('/jobkategori/:jobkategori', registration.forJobCategory.bind(registration))
        .get('/enhed/:enhed', registration.forOrganization.bind(registration))
        .get('/delregnskab/:projekt/:aktivitet', registration.account.bind(registration))
        .post('/skabelon', registration.saveTemplate.bind(registration))
        .post('/ny', registration.send.bind(registration));
    approveRouter
        .get('/', approve.index.bind(approve))
        .post('/godkende', approve.approve.bind(approve))
        .post('/afvise', approve.reject.bind(approve))
        .get('/:id', approve.get.bind(approve));
    app.listen(process.env.PORT || 8192);
});