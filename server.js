"use strict";
var bodyParser = require('body-parser'),
    path = require('path'),
    express = require('express'),
    JobCategoryConfig = require('./routes/jobcategoryconfig'),
    app = express(),
    tableService = null,
    fn = null;

function development(callback) {
    var MongoClient = require('mongodb').MongoClient,
        MongoService = require('./modules/MongoService');

    MongoClient.connect("mongodb://localhost:27017/aarhus", function (error, db) {
        if (error) {
            throw error;
        } else {
            tableService = new MongoService(db);
            callback(tableService);
        }
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
                var Module = require(path.join(__dirname, 'modules', key)),
                    instance = new Module(tableService, function () {
                        instance.install(function (errors) {
                            if (errors && errors.length) {
                                errors.forEach(function (error) {
                                    console.error(error);
                                });
                            } else {
                                console.log('%s setup OK', key);
                            }
                        });
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

var env = process.env.NODE_ENV || '';
switch (env) {
case '':
    fn = production;
    break;
case 'dev':
    fn = development;
    break;
}

fn(function () {
    setup();
    var jobCategoryConfig = new JobCategoryConfig(tableService);
    app.get('/job-category-config', jobCategoryConfig.index.bind(jobCategoryConfig));
    app.get('/job-category-config/:uuid', jobCategoryConfig.get.bind(jobCategoryConfig));
    app.get('/job-category-config/:id/detail', jobCategoryConfig.detail.bind(jobCategoryConfig));
    app.get('/job-category-config/:uuid/detail/:id', jobCategoryConfig.detail.bind(jobCategoryConfig));
    app.listen(process.env.PORT || 8192);
});