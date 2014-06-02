"use strict";

var Q = require("Q"),
    _ = require("underscore"),
    uuid = require("node-uuid"),
    Task = require("../modules/Task"),
    jobsTable = "medarbejderJob",
    orgsTable = "medarbejderOrg";

function MedarbejderJob(tableService) {
    this.jobs = new Task(tableService, jobsTable);
    this.orgs = new Task(tableService, orgsTable);
}

function structure(jobs, orgs) {
    var structures = [];
    jobs.sort(function (left, right) {
        return left.fra > right.fra;
    }).forEach(function (job) {
        job.enheder = _.where(orgs, { job: job.RowKey });
        structures.push(job);
    });
    return structures;
}

MedarbejderJob.prototype.get = function (ssn, callback) {
    var self = this,
        d = Q.defer(),
        jobsQuery = process.env.NODE_ENV === "dev" ?
                { table: jobsTable, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(jobsTable).where("PartitionKey eq ?", ssn),
        orgsQuery = process.env.NODE_ENV === "dev" ?
                { table: orgsTable, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(orgsTable).where("PartitionKey eq ?", ssn);
    this.jobs.queryEntities(jobsQuery, function (error, jobs) {
        if (error) {
            d.reject(error);
        } else {
            self.orgs.queryEntities(orgsQuery, function (error, orgs) {
                if (error) {
                    d.reject(error);
                } else {
                    d.resolve(structure(jobs, orgs));
                }
            });
        }
    });
    return d.promise.nodeify(callback);
};


MedarbejderJob.prototype.getJobs = function (ssn, callback) {
    var d = Q.defer(),
        jobsQuery = process.env.NODE_ENV === "dev" ?
                    { table: jobsTable, query: { PartitionKey: ssn } } :
                    require("azure").TableQuery.select().from(jobsTable).where("PartitionKey eq ?", ssn);
    this.jobs.queryEntities(jobsQuery, function (error, jobs) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(jobs);
        }
    });
    return d.promise.nodeify(callback);
};

MedarbejderJob.prototype.getOrgs = function (ssn, callback) {
    var d = Q.defer(),
        orgsQuery = process.env.NODE_ENV === "dev" ?
                { table: orgsTable, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(orgsTable).where("PartitionKey eq ?", ssn);
    this.jobs.queryEntities(orgsQuery, function (error, orgs) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(orgs);
        }
    });
    return d.promise.nodeify(callback);
};

MedarbejderJob.prototype.removeJob = function (job, ssn, callback) {
    var self = this,
        d = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: orgsTable, query: { job: job } } :
                require("azure").TableQuery.select().from(orgsTable).where("job eq ?", job);
    this.jobs.deleteEntity({ PartitionKey: ssn, RowKey: job }, function (error) {
        if (error) {
            d.reject(error);
        } else {
            self.orgs.queryEntities(query, function (error, entities) {
                if (error) {
                    d.reject(error);
                } else {
                    entities.forEach(function (entity) {
                        self.orgs.deleteEntity(entity);
                    });
                    d.resolve();
                }
            });
        }
    });
    return d.promise.nodeify(callback);
};

MedarbejderJob.prototype.removeOrg = function (org, ssn, callback) {
    var d = Q.defer();
    this.orgs.deleteEntity({ PartitionKey: ssn, RowKey: org }, function (error) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve();
        }
    });
    return d.promise.nodeify(callback);
};

MedarbejderJob.prototype.addJob = function (ssn, jobcategories, callback) {
    var self = this,
        d = Q.defer();
    jobcategories.forEach(function (jobcategory) {
        jobcategory.PartitionKey = ssn;
        jobcategory.RowKey = uuid.v4();
        jobcategory.enheder.forEach(function (enhed) {
            enhed.PartitionKey = ssn;
            enhed.RowKey = uuid.v4();
            enhed.job = jobcategory.RowKey;
            self.orgs.insertEntity(enhed, function (error) {
                if (error) {
                    d.reject(error);
                }
            });
        });
        delete jobcategory.enheder;
        self.jobs.insertEntity(jobcategory, function (error) {
            if (error) {
                d.reject(error);
            } else {
                d.resolve();
            }
        });
    });
    return d.promise.nodeify(callback);
};

module.exports = MedarbejderJob;