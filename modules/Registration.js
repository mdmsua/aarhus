"use strict";

var util = require("util"),
    Q = require("Q"),
    _ = require("underscore"),
    moment = require("moment"),
    Projekt = require("../modules/Projekt"),
    Aktivitet = require("../modules/Aktivitet"),
    Kombo = require("../modules/Kombo"),
    Sted = require("../modules/Sted"),
    Delregnskab = require("../modules/Delregnskab"),
    JobCategoryConfig = require("../modules/JobCategoryConfig"),
    Enhed = require("../modules/Enhed"),
    Employee = require("../modules/Medarbejder"),
    JobOrg = require("../modules/JobOrg"),
    Lko = require("../modules/Lko"),
    Preference = require("../modules/Indstilling"),
    Samtale = require("../modules/Samtale"),
    Rolle = require("../modules/Rolle"),
    Task = require("../modules/Task"),
    table = "registrering";

function Registration(tableService) {
    this.projekt = new Projekt(tableService);
    this.aktivitet = new Aktivitet(tableService);
    this.kombo = new Kombo(tableService);
    this.sted = new Sted(tableService);
    this.delregnskab = new Delregnskab(tableService);
    this.registrering = new Task(tableService, table);
    this.jobCategoryConfig = new JobCategoryConfig(tableService);
    this.enhed = new Enhed(tableService);
    this.employee = new Employee(tableService);
    this.lko = new Lko(tableService);
    this.joborg = new JobOrg(tableService);
    this.preference = new Preference(tableService);
    this.samtale = new Samtale(tableService);
    this.rolle = new Rolle(tableService);
}

Registration.prototype.get = function (lock, period, user, callback) {
    var deferred = Q.defer(),
        from = (period > 0 ? moment().startOf("month").add("M", 1) :
                period === 0 ? moment().startOf("month") :
                        moment().startOf("month").add("M", period)).toDate().getTime().toString(),
        to = (period > 0 ? moment().endOf("month").add("M", period) :
                period === 0 ? moment().endOf("month") :
                        moment().startOf("month")).toDate().getTime().toString(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [{ PartitionKey: table }, { lock: lock }, { RowKey: { $gt: from, $lt: to } }] } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and lock eq ? and RowKey gt ? and RowKey lt ?", table, lock, from, to);
    this.registrering.queryEntities(query, function (error, registrations) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(registrations.filter(function (registration) {
                return user ? registration.medarbejderkode === user.cpr : true;
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.create = function (registration, callback) {
    var self = this,
        deferred = Q.defer();
    registration.PartitionKey = table;
    registration.RowKey = new Date().getTime().toString();
    this.registrering.insertEntity(registration, function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            var role = "";
            switch (registration.lock) {
            case 0:
                role = "Timelønnede";
                break;
            case 1:
                role = "Sekretær";
                break;
            case 2:
                role = "økonom";
                break;
            }
            self.samtale.add(registration.RowKey, {
                rolle: role,
                medarbejderkode: registration.medarbejderkode,
                medarbejdernavn: registration.medarbejdernavn,
                kommentar: registration.kommentar
            }, function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(entity);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getForOrganization = function (organization, callback) {
    var self = this,
        deferred = Q.defer();
    this.enhed.one(organization, function (error, enhed) {
        if (error) {
            deferred.reject(error);
        } else {
            self.kombo.byLocation(enhed.location, function (error, kombos) {
                if (error) {
                    deferred.reject(error);
                } else {
                    var projects = _.uniq(_.pluck(kombos, "PartitionKey")),
                        activities = _.uniq(_.pluck(kombos, "RowKey")),
                        accounts = _.uniq(_.pluck(kombos, "delregnskab"));
                    Q.all([self.projekt.ones(projects),
                        self.aktivitet.ones(activities),
                        self.delregnskab.ones(accounts),
                        self.sted.one(enhed.location)])
                        .spread(function (projects, activities, accounts, location) {
                            deferred.resolve({
                                projects: projects,
                                activities: activities,
                                accounts: accounts,
                                location: location
                            });
                        }, function (error) {
                            deferred.reject(error);
                        });
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getForLocation = function (location, callback) {
    var self = this,
        deferred = Q.defer();
    this.kombo.byLocation(location, function (error, kombos) {
        if (error) {
            deferred.reject(error);
        } else {
            var projects = _.uniq(_.pluck(kombos, "PartitionKey")),
                activities = _.uniq(_.pluck(kombos, "RowKey"));
            Q.all([self.projekt.ones(projects), self.aktivitet.ones(activities)])
                .spread(function (projects, activities) {
                    deferred.resolve({
                        projects: projects,
                        activities: activities
                    });
                }, function (error) {
                    deferred.reject(error);
                });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.activities = function (project, callback) {
    var self = this;
    this.kombo.project(project, function (error, activities) {
        if (error) {
            callback(error);
        } else {
            var deferred = Q.defer();
            self.byProjectActivity.ones(_.pluck(activities, "RowKey"), function (error, names) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(names);
                }
            });
            return deferred.promise.nodeify(callback);
        }
    });
};

Registration.prototype.stuff = function (project, activity, callback) {
    var self = this;
    this.kombo.byProjectActivity(project, activity, function (error, stuff) {
        if (error) {
            callback(error);
        } else {
            var deferred = Q.defer();
            Q.all([self.sted.one(stuff.sted), self.delregnskab.one(stuff.delregnskab)]).spread(function (sted, delregnskab) {
                return deferred.resolve({
                    sted: util.format("%s_%s", sted.kode, sted.navn),
                    delregnskab: util.format("%s_%s", delregnskab.kode, delregnskab.navn)
                });
            });
            return deferred.promise.nodeify(callback);
        }
    });
};

Registration.prototype.getDrafts = function (user, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [{ PartitionKey: "kladde" }, { medarbejderkode: user.ssn }] } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and medarbejderkode eq ?", "kladde", user.ssn);
    this.registrering.queryEntities(query, function (error, drafts) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(drafts.map(function (draft) {
                delete draft._;
                draft.oprettet = moment(new Date(Number(draft.RowKey))).format('LLLL');
                return draft;
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getDraft = function (id, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [
                    { PartitionKey: "kladde" },
                    { RowKey: id }
                ] } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and RowKey eq ?", "kladde", id);
    this.registrering.queryEntities(query, function (error, drafts) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(drafts.map(function (draft) {
                delete draft._;
                return draft;
            })[0]);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.saveDraft = function (draft, callback) {
    var deferred = Q.defer();
    draft.PartitionKey = "kladde";
    draft.RowKey = new Date().getTime().toString();
    this.registrering.insertEntity(draft, function (error, draft) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(draft);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.deleteDraft = function (id, callback) {
    var deferred = Q.defer();
    this.registrering.deleteEntity({PartitionKey: "kladde", RowKey: id }, function (error, count) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(count);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getTemplates = function (user, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [{ PartitionKey: "skabelon" }, { medarbejderkode: user.ssn }] }} :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and medarbejderkode eq ?", "skabelon", user.ssn);
    this.registrering.queryEntities(query, function (error, templates) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(templates.map(function (template) {
                delete template._;
                return template;
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getTemplate = function (id, callback) {
    var deferred = Q.defer(),
        query = process.env.NODE_ENV === "dev" ?
                { table: table, query: { $and: [
                    { PartitionKey: "skabelon" },
                    { RowKey: id }
                ] } } :
                require("azure").TableQuery.select().from(table).where("PartitionKey eq ? and RowKey eq ?", "skabelon", id);
    this.registrering.queryEntities(query, function (error, templates) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(templates.map(function (template) {
                delete template._;
                return template;
            })[0]);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.saveTemplate = function (template, callback) {
    var deferred = Q.defer();
    template.PartitionKey = "skabelon";
    template.RowKey = template.skabelon;
    delete template.skabelon;
    this.registrering.insertEntity(template, function (error, template) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(template);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.deleteTemplate = function (id, callback) {
    var deferred = Q.defer();
    this.registrering.deleteEntity({ PartitionKey: "skabelon", RowKey: id }, function (error, count) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(count);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getJobCategories = function (ssn, callback) {
    var deferred = Q.defer();
    this.joborg.getJobs(ssn, function (error, jobCategories) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(jobCategories);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getLkos = function (callback) {
    var deferred = Q.defer();
    this.lko.all(function (error, lkos) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(lkos);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getLkosForJobCategory = function (jobCategory, callback) {
    var deferred = Q.defer(),
        self = this;
    this.jobCategoryConfig.one(jobCategory, function (error, jc) {
        if (error) {
            deferred.reject(error);
        } else {
            self.lko.one(jc.lko, function (error, lko) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve([lko]);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getOrganisations = function (ssn, callback) {
    var deferred = Q.defer();
    this.joborg.getOrgs(ssn, function (error, organisations) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(organisations.filter(function (organisation) {
                return organisation.til ? (moment().isBefore(moment(organisation.til, "DD-MM-YYYY")) &&
                    moment().isAfter(moment(organisation.fra, "DD-MM-YYYY"))) :
                        moment().isAfter(moment(organisation.fra, "DD-MM-YYYY"));
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getOrganisationsForRole = function (ssn, role, callback) {
    var deferred = Q.defer();
    this.rolle.find(ssn, role, function (error, organisations) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(organisations.filter(function (organisation) {
                return organisation.til ? (moment().isBefore(moment(organisation.til, "DD-MM-YYYY")) &&
                    moment().isAfter(moment(organisation.fra, "DD-MM-YYYY"))) :
                        moment().isAfter(moment(organisation.fra, "DD-MM-YYYY"));
            }));
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.findEmployeesInOrganizations = function (organizations, callback) {
    var self = this,
        deferred = Q.defer(),
        orgQueue = [],
        empQueue = [],
        orgs = [];
    organizations.forEach(function (organization) {
        orgs = _.union(orgs, organization.koder.split(","));
    });
    orgs.forEach(function (org) {
        orgQueue.push(self.joborg.getEmployees(org));
    });
    Q.all(orgQueue).spread(function (employeeGroups) {
        employeeGroups.forEach(function (employeeGroup) {
            if (util.isArray(employeeGroup)) {
                employeeGroup.forEach(function (employee) {
                    if (employee.til ? (moment().isBefore(moment(employee.til, "DD-MM-YYYY")) &&
                        moment().isAfter(moment(employee.fra, "DD-MM-YYYY"))) :
                                moment().isAfter(moment(employee.fra, "DD-MM-YYYY"))) {
                        empQueue.push(self.employee.one(employee.PartitionKey));
                    }
                });
            } else if (employeeGroup.til ? (moment().isBefore(moment(employeeGroup.til, "DD-MM-YYYY")) &&
                moment().isAfter(moment(employeeGroup.fra, "DD-MM-YYYY"))) :
                        moment().isAfter(moment(employeeGroup.fra, "DD-MM-YYYY"))) {
                empQueue.push(self.employee.one(employeeGroup.PartitionKey));
            }
        });
        Q.all(empQueue).spread(function (employees) {
            deferred.resolve(_.union(employees));
        }, function (error) {
            deferred.reject(error);
        });
    }, function (error) {
        deferred.reject(error);
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getLocations = function (organization, callback) {
    var deferred = Q.defer(),
        self = this;
    this.enhed.one(organization, function (error, organization) {
        if (error) {
            deferred.reject(error);
        } else {
            self.sted.one(organization.location, function (error, location) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve([location]);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getAccounts = function (project, activity, callback) {
    var deferred = Q.defer(),
        self = this;
    this.kombo.byProjectActivity(project, activity, function (error, accounts) {
        if (error) {
            deferred.reject(error);
        } else {
            self.delregnskab.ones(_.pluck(accounts, "delregnskab"), function (error, accounts) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(accounts);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getEmployees = function (callback) {
    var deferred = Q.defer();
    this.employee.all(function (error, employees) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(employees);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getPreferences = function (ssn, role, callback) {
    var deferred = Q.defer();
    this.preference.get(ssn, role, function (error, preference) {
        if (error) {
            deferred.reject(error);
        } else {
            if (!preference) {
                switch (role) {
                case "Timelønnede":
                    preference = {
                        "Medarbejder": false,
                        "Jobkategori": true,
                        "Enhed": true,
                        "Dato": true,
                        "Lønkode": true,
                        "Projekt": true,
                        "Aktivitet": true,
                        "Sted": true,
                        "Delregnskab": true,
                        "Værdi": true,
                        "Kommentar": true
                    };
                    break;
                default:
                    preference = {
                        "Medarbejder": true,
                        "Jobkategori": true,
                        "Enhed": true,
                        "Dato": true,
                        "Lønkode": true,
                        "Projekt": true,
                        "Aktivitet": true,
                        "Sted": true,
                        "Delregnskab": true,
                        "Værdi": true,
                        "Kommentar": true
                    };
                }
            }
            deferred.resolve(preference);
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.savePreferences = function (ssn, role, preference, callback) {
    var deferred = Q.defer();
    this.preference.save(ssn, role, preference, function (error) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.update = function (item, role, callback) {
    var self = this,
        deferred = Q.defer();
    this.registrering.updateEntity(item, function (error, message) {
        if (error) {
            deferred.reject(error);
        } else {
            self.samtale.add(item.RowKey, {
                rolle: role,
                medarbejderkode: item.medarbejderkode,
                medarbejdernavn: item.medarbejdernavn,
                kommentar: item.kommentar
            }, function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(message);
                }
            });
            deferred.resolve();
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.getRegistration = function (id, role, callback) {
    var deferred = Q.defer(),
        self = this;
    this.registrering.getEntity("registrering", id, function (error, registration) {
        if (error) {
            deferred.reject(error);
        } else {
            self.samtale.find(id, role, function (error, conversations) {
                if (error) {
                    deferred.reject(error);
                } else {
                    registration.samtaler = conversations;
                    deferred.resolve(registration);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Registration.prototype.deleteRegistration = function (id, callback) {
    var deferred = Q.defer(),
        self = this;
    this.registrering.deleteEntity({ PartitionKey: "registrering", RowKey: id }, function (error, count) {
        if (error) {
            deferred.reject(error);
        } else {
            self.samtale.remove(id, function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

module.exports = Registration;