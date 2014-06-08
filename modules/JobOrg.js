"use strict";

var util = require("util"),
    Q = require("Q"),
    _ = require("underscore"),
    uuid = require("node-uuid"),
    Task = require("../modules/Task"),
    jobTable = "job",
    orgTable = "org";

function JobOrg(tableService) {
    this.jobs = new Task(tableService, jobTable);
    this.orgs = new Task(tableService, orgTable);
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

JobOrg.prototype.get = function (ssn, callback) {
    var self = this,
        d = Q.defer(),
        jobsQuery = process.env.NODE_ENV === "dev" ?
                { table: jobTable, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(jobTable).where("PartitionKey eq ?", ssn),
        orgsQuery = process.env.NODE_ENV === "dev" ?
                { table: orgTable, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(orgTable).where("PartitionKey eq ?", ssn);
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


JobOrg.prototype.getJobs = function (ssn, callback) {
    var d = Q.defer(),
        jobsQuery = process.env.NODE_ENV === "dev" ?
                    { table: jobTable, query: { PartitionKey: ssn } } :
                    require("azure").TableQuery.select().from(jobTable).where("PartitionKey eq ?", ssn);
    this.jobs.queryEntities(jobsQuery, function (error, jobs) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(jobs);
        }
    });
    return d.promise.nodeify(callback);
};

JobOrg.prototype.getOrgs = function (ssn, callback) {
    var d = Q.defer(),
        orgsQuery = process.env.NODE_ENV === "dev" ?
                { table: orgTable, query: { PartitionKey: ssn } } :
                require("azure").TableQuery.select().from(orgTable).where("PartitionKey eq ?", ssn);
    this.jobs.queryEntities(orgsQuery, function (error, orgs) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(orgs);
        }
    });
    return d.promise.nodeify(callback);
};

JobOrg.prototype.removeJob = function (job, ssn, callback) {
    var self = this,
        d = Q.defer(),
        queue = [],
        query = process.env.NODE_ENV === "dev" ?
                { table: orgTable, query: { job: job } } :
                require("azure").TableQuery.select().from(orgTable).where("job eq ?", job);
    this.jobs.deleteEntity({ PartitionKey: ssn, RowKey: job }, function (error) {
        if (error) {
            d.reject(error);
        } else {
            self.orgs.queryEntities(query, function (error, entities) {
                if (error) {
                    d.reject(error);
                } else {
                    entities.forEach(function (entity) {
                        queue.push(self.orgs.deleteEntity(entity));
                    });
                    Q.all(queue).spread(function () {
                        d.resolve();
                    }, function (error) {
                        d.reject(error);
                    });
                }
            });
        }
    });
    return d.promise.nodeify(callback);
};

JobOrg.prototype.removeOrg = function (org, ssn, callback) {
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

JobOrg.prototype.addJobs = function (ssn, jobcategories, callback) {
    var jobKey = "",
        self = this,
        d = Q.defer();
    jobcategories.forEach(function (jobcategory) {
        jobKey = util.format("%s_%s_%s", jobcategory.navn, jobcategory.fra, jobcategory.til);
        jobcategory.enheder.forEach(function (enhed) {
            self.orgs.insertEntity({
                PartitionKey: ssn,
                RowKey: uuid.v4(),
                kode: enhed.kode,
                navn: enhed.navn,
                fra: enhed.fra,
                til: enhed.til,
                job: jobKey
            }, function (error) {
                if (error) {
                    d.reject(error);
                }
            });
        });
        self.jobs.insertEntity({
            PartitionKey: ssn,
            RowKey: jobKey,
            kode: jobcategory.kode,
            navn: jobcategory.navn,
            fra: jobcategory.fra,
            til: jobcategory.til
        }, function (error) {
            if (error) {
                d.reject(error);
            } else {
                d.resolve();
            }
        });
    });
    return d.promise.nodeify(callback);
};


JobOrg.prototype.deleteAll = function (ssn, callback) {
    var self = this,
        queue = [],
        deferred = Q.defer();
    this.getJobs(ssn, function (error, jobs) {
        if (error) {
            deferred.reject(error);
        } else {
            jobs.forEach(function (job) {
                queue.push(self.removeJob(job.RowKey, ssn));
            });
            Q.all(queue).spread(function () {
                deferred.resolve();
            }, function (error) {
                deferred.reject(error);
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = JobOrg;