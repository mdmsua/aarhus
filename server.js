"use strict";
var util = require("util"),
    bodyParser = require("body-parser"),
    cookieParser = require("cookie-parser"),
    session = require("express-session"),
    methodOverride = require("method-override"),
    favicon = require("serve-favicon"),
    morgan = require("morgan"),
    path = require("path"),
    express = require("express"),
    passport = require("passport"),
    redis = require("redis"),
    LocalStrategy = require("passport-local").Strategy,
    RedisStore = require("connect-redis")(session),
    JobCategoryConfig = require("./routes/jobcategoryconfig"),
    Medarbejder = require("./routes/Medarbejder"),
    Registrering = require("./routes/Registrering"),
    Godkende = require("./routes/Godkende"),
    index = require("./routes/index"),
    Employee = require("./modules/Medarbejder"),
    app = express(),
    tableService = null,
    employee = null,
    redisClient = null,
    routes = [
        { name: "Jobkategori", href: "/jobkategori" },
        { name: "Medarbejder", href: "/medarbejder" },
        { name: "Registrering", href: "/registrering" }
        /*{ name: "Sekretær", href: "/sekretær" },
        { name: "økonom", href: "/økonom" }*/
    ];

function development(callback) {
    var MongoClient = require("mongodb").MongoClient,
        MongoService = require("./modules/MongoService");

    MongoClient.connect("mongodb://localhost:27017/aarhus", function (error, db) {
        if (error) {
            throw error;
        }
        tableService = new MongoService(db);
        redisClient = redis.createClient();
        callback(tableService, redisClient);
    });
}

function production(callback) {
    var nconf = require("nconf"),
        azure = require("azure");
    nconf.file("settings.json").env();
    tableService = azure.createTableService(nconf.get("AZURE_STORAGE_ACCOUNT"), nconf.get("AZURE_STORAGE_ACCESS_KEY"));
    redisClient = redis.createClient(6379, nconf.get("AZURE_CACHE_ACCOUNT"));
    redisClient.auth(nconf.get("AZURE_CACHE_ACCESS_KEY"), function () {
        callback(tableService, redisClient);
    });
}

function setup() {
    var imports = (process.argv[2] || "").split(",");
    imports.forEach(function (key) {
        if (key) {
            try {
                console.log("Installing %s", key);
                var Module = require(path.join(__dirname, "modules", key)),
                    instance = new Module(tableService);
                console.log("Ready to setup %s", key);
                instance.install(function (errors) {
                    if (errors && errors.length) {
                        errors.forEach(function (error) {
                            console.error(error);
                        });
                    } else {
                        console.log("%s setup OK", key);
                    }
                });
            } catch (error) {
                console.error("%s setup FAIL: %s", key, error);
            }
        }
    });
}

function authenticate(username, password, done) {
    if (username === "admin" && password === "admin") {
        return done(null, { initialer: "@" });
    }
    employee = new Employee(tableService);
    employee.getByInitials(username.toUpperCase(), function (err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, { message: "Brugernavnet er ugyldigt" });
        }
        if (password.toLowerCase() !== "pwd") {
            return done(null, false, { message: "Adgangskoden er ugyldig" });
        }
        return done(null, user);
    });
}


function init() {
    var employee = new Employee(tableService);
    passport.use(new LocalStrategy(authenticate));
    passport.serializeUser(function (user, done) {
        done(null, user.initialer);
    });
    passport.deserializeUser(function (id, done) {
        if (id === "@") {
            done(null, { initialer: "@", roller: ["Administrator"] });
        } else {
            employee.getByInitials(id, function (err, user) {
                done(err, user);
            });
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

function authorize(req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user) {
            req.user.navn = req.user.initialer === "@" ? req.user.roller[0] : util.format("%s %s", req.user.fornavn, req.user.efternavn);
            res.locals.user = req.user;
        }
        req.user.roller = util.isArray(req.user.roller) ? req.user.roller : [req.user.roller];
        if (req.user.roller.indexOf('Administrator') > -1) {
            res.locals.routes = routes;
        } else if (req.user.roller.indexOf('Timelønnede') > -1) {
            res.locals.routes = routes.slice(2, 3);
        } /*else if (req.user.roller.indexOf('Sekretær') > -1) {
            req.locals.routes = routes.slice(0, 3);
        } else if (req.user.roller.indexOf('Sekretær') > -1) {
            req.locals.routes = routes.slice(0, 3);
        }*/
        next();
    } else if (req.path === "/login") {
        next();
    } else {
        res.redirect("/login?_=" + req.path);
    }
}

var employeeRouter = express.Router(),
    jobCategoryConfigRouter = express.Router(),
    registrationRouter = express.Router(),
    approveRouter = express.Router();

var env = process.env.NODE_ENV || "",
    fn = env === "dev" ? development : production;

fn(function (tableService, redisClient) {
    app.set("view engine", "jade");
    app.use(favicon(path.join(__dirname, "public/favicon.ico")));
    app.use(express.static(__dirname + "/public"));
    app.use(express.static(__dirname + "/bower_components"));
    app.use(express.static(__dirname + "/bower_components/bootstrap"));
    app.use(bodyParser());
    app.use(cookieParser());
    app.use(session({ store: new RedisStore({ client: redisClient }), secret: "Try2gue$$" }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(morgan(env === "dev" ? "dev" : "default"));
    app.use(methodOverride());
    app.use(authorize);
    app.use("/jobkategori", jobCategoryConfigRouter);
    app.use("/medarbejder", employeeRouter);
    app.use("/registrering", registrationRouter);
    app.use("/godkende", approveRouter);
    setup();
    init();
    var jobCategoryConfig,
        employee,
        registration;
    //approve;
    jobCategoryConfig = new JobCategoryConfig(tableService);
    employee = new Medarbejder(tableService, redisClient);
    registration = new Registrering(tableService);
    //approve = new Godkende(tableService);
    app.get("/", index.index);
    app.get("/login", index.signIn);
    app.get("/logaf", index.signOut);
    app.post("/login", passport.authenticate("local"), function (req, res) {
        res.redirect(req.body.path === "/login" ? "/" : (req.body.path || "/"));
    });
    jobCategoryConfigRouter.get("/", jobCategoryConfig.index.bind(jobCategoryConfig));
    jobCategoryConfigRouter.get("/:uuid", jobCategoryConfig.get.bind(jobCategoryConfig));
    jobCategoryConfigRouter.get("/:id/detail", jobCategoryConfig.detail.bind(jobCategoryConfig));
    jobCategoryConfigRouter.get("/:uuid/detail/:id", jobCategoryConfig.detail.bind(jobCategoryConfig));
    employeeRouter
        .get("/", employee.index.bind(employee))
        .post("/", employee.search.bind(employee))
        .get("/ny", employee.create.bind(employee))
        .post("/ny", employee.save.bind(employee))
        .get("/delregnskaber", employee.accounts.bind(employee))
        .get("/projekter", employee.projects.bind(employee))
        .get("/aktiviteter", employee.activities.bind(employee))
        .get("/steder", employee.locations.bind(employee))
        .get("/enheder", employee.organizations.bind(employee))
        .get("/:ssn/opdatering", employee.update.bind(employee))
        .post("/:ssn/opdatering", employee.save.bind(employee))
        .get("/organisations", employee.organisations.bind(employee))
        .get("/:ssn", employee.get.bind(employee))
        .get("/job/:uuid", employee.config.bind(employee))
        .post("/:ssn/job/:id", employee.deleteJob.bind(employee))
        .post("/:ssn/org/:id", employee.deleteOrg.bind(employee));
    registrationRouter
        .get("/ny", registration.create.bind(registration))
        .post("/ny", registration.send.bind(registration))
        .get("/cpr/:ssn?", registration.getJobCategories.bind(registration))
        .get("/sted/:sted", registration.forLocation.bind(registration))
        .post("/kladde", registration.saveDraft.bind(registration))
        .get("/jobkategori/:jobkategori", registration.findOrganizations.bind(registration))
        .get("/enhed/:enhed", registration.forOrganization.bind(registration))
        .get("/delregnskab/:projekt/:aktivitet", registration.account.bind(registration))
        .post("/skabelon", registration.saveTemplate.bind(registration))
        .delete("/:id", registration.remove.bind(registration))
        .get("/vis/:id", registration.view.bind(registration))
        .post("/vis/:id", registration.update.bind(registration))
        .post("/indstillinger", registration.savePreferences.bind(registration))
        .get("/:period?", registration.index.bind(registration));
//    approveRouter
//        .get("/", approve.index.bind(approve))
//        .post("/godkende", approve.approve.bind(approve))
//        .post("/afvise", approve.reject.bind(approve))
//        .get("/:id", approve.get.bind(approve));
    app.listen(process.env.PORT || 8192);
});