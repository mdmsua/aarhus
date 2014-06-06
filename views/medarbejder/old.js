$(function () {
    var touch = Modernizr.touch,
        options = {
            format: "dd-mm-yyyy",
            weekStart: 1,
            language: "da",
            autoclose: true
        },
        $body = $("body"),
        frasubscribtion = null,
        tilsubscribtion = null,
        vm = {
            medarbejder: ko.observable(),
            job: ko.observable(null),
            org: ko.observable(null),
            jobkategori: ko.observable(null),
            enhed: ko.observable(null),
            enheder: ko.observableArray(ko.toJS(JSON.parse($("#organizations").val()))),
            jobcategories: JSON.parse($("#alljobcategories").val()),
            showJobCategories: ko.observable($("#showjobcategories").val() != "-1"),
            showRoles: ko.observable($("#isSecretary").val() != "-1" || $("#isEconomist").val() != "-1"),
            jobcategory: function () {
                vm.jobkategori({
                    fra: ko.observable(),
                    til: ko.observable(),
                    enhed: ko.observable({
                        fra: ko.observable(),
                        til: ko.observable(),
                        kode: ko.observable(),
                        navn: ko.observable()
                    }),
                    enheder: ko.observableArray([]),
                    kode: ko.observable(),
                    navn: ko.observable()
                });
                if (!touch) {
                    $(".right .select").select2();
                    $(".right .date").datepicker(options);
                }
                frasubscribtion = vm.jobkategori().fra.subscribe(function (value) {
                    vm.jobkategori().enhed().fra(value);
                });
                tilsubscribtion = vm.jobkategori().til.subscribe(function (value) {
                    vm.jobkategori().enhed().til(value);
                });
            },
            addJob: function () {
                var jobkategori = vm.jobkategori();
                vm.jobkategorier.unshift({
                    fra: ko.observable(jobkategori.fra()),
                    til: ko.observable(jobkategori.til()),
                    navn: _.findWhere(vm.jobcategories, { uuid: jobkategori.kode() }).stilling,
                    kode: jobkategori.kode(),
                    enhed: ko.observable(false),
                    enheder: ko.observableArray(jobkategori.enheder().map(function (enhed) {
                        return {
                            fra: enhed.fra,
                            til: enhed.til,
                            navn: enhed.navn,
                            kode: enhed.kode
                        }
                    }))
                });
                vm.remJob();
                vm.job(JSON.stringify(vm.jobkategorier()));
            },
            remJob: function () {
                vm.jobkategori(null);
                vm.jobkategorier.remove(this);
                frasubscribtion.dispose();
                tilsubscribtion.dispose();
                if (!touch) {
                    $(".right .select").select2("destroy");
                }
            },
            addOrg: function () {
                var enhed = vm.jobkategori().enhed();
                vm.jobkategori().enheder.push({
                    fra: enhed.fra(),
                    til: enhed.til(),
                    navn: _.findWhere(vm.enheder(), { kode: enhed.kode() }).navn,
                    kode: enhed.kode()
                });
                vm.remOrg();
            },
            remOrg: function () {
                vm.jobkategori().enhed().fra(null);
                vm.jobkategori().enhed().til(null);
                vm.jobkategori().enhed().kode(null);
                vm.jobkategori().enhed().navn(null);
            },
            remove: function () {
                vm.jobkategori().enheder.remove(this);
            },
            organization: function(data) {
                if (!touch) {
                    $(".center .date").datepicker(options);
                    $(".center .select").select2();
                }
                data.enhed(!data.enhed());
            },
            addEnhed: function (data) {
                data.enheder.push({
                    fra: data.fra(),
                    til: data.til(),
                    koder: data.koder(),
                    navne: data.koder().map(function (kode) {
                        return _.findWhere(vm.enheder(), { kode: kode }).navn;
                    })
                });
                vm.remEnhed(data);
            },
            remEnhed: function (data) {
                data.enhed(false);
                data.fra(null);
                data.til(null);
                data.koder([]);
                if (!touch) {
                    $(".center .select").select2("destroy");
                }
                vm.org(JSON.stringify(ko.toJS(vm.roller)));
            },
            delEnhed: function(data, parent) {
                parent.enheder.remove(data);
            },
            delOrg: function (data, parent) {
                parent.enheder.remove(data);
            },
            attachEnhed: function (jobcategory) {
                console.log(jobcategory);
                jobcategory.enhed().navn(_.findWhere(vm.enheder(), { kode: jobcategory.enhed().kode() }).navn);
                jobcategory.enheder.push(jobcategory.enhed());
                vm.detachEnhed(jobcategory);
            },
            detachEnhed: function (jobcategory) {
                jobcategory.enhed(false);
                if (!touch) {
                    $(".right .select").select2("destroy");
                }
            },
            toggleEnhed: function (jobcategory) {
                jobcategory.enhed({
                    fra: ko.observable(),
                    til: ko.observable(),
                    kode: ko.observable(),
                    navn: ko.observable()
                });
                if (!touch) {
                    $(".right .select").select2();
                    $(".right .date").datepicker(options);
                }
            }
        };
    ko.applyBindings(vm);
    ko.mapping.fromJS(JSON.parse($("#medarbejder").val()), vm);
    console.log(JSON.parse($("#medarbejder").val()));
    console.log(vm);
    if (!touch) {
        $("#jobkategorier, #roller, #enheder").select2();
        $("input[name='dato']").datepicker(options);
    }
    $("#roller").on("change", function () {
        var roller = $(this).val() || [];
        console.log(JSON.stringify(vm.roller()));
        if (_.find(vm.roller, function (rolle) {
            return ko.isObservable(rolle.rolle) ? rolle.rolle() : rolle.rolle === "Sekretær";
        })) {
            console.log("sec found");
            if (roller.indexOf("Sekretær") === -1) {
                console.log("sec removed");
                vm.roller.remove(function (rolle) {
                    return ko.isObservable(rolle.rolle) ? rolle.rolle() : rolle.rolle === "Sekretær";
                });
            }
        } else if (roller.indexOf("Sekretær") > -1) {
            console.log("sec added");
            vm.roller.push({
                rolle: "Sekretær",
                enheder: ko.observableArray([]),
                navne: ko.observableArray([]),
                koder: ko.observableArray([]),
                enhed: ko.observable(false),
                fra: ko.observable(),
                til: ko.observable()
            });
        }
        if (_.find(vm.roller, function (rolle) {
            return ko.isObservable(rolle.rolle) ? rolle.rolle() : rolle.rolle === "økonom";
        })) {
            console.log("eco found");
            if (roller.indexOf("økonom") > -1) {
                console.log("eco removed");
                vm.roller.remove(function (rolle) {
                    return ko.isObservable(rolle.rolle) ? rolle.rolle() : rolle.rolle === "økonom";
                });
            }
        } else if (roller.indexOf("økonom") > -1) {
            console.log("eco added");
            vm.roller.push({
                rolle: "økonom",
                enheder: ko.observableArray([]),
                navne: ko.observableArray([]),
                koder: ko.observableArray([]),
                enhed: ko.observable(false),
                fra: ko.observable(),
                til: ko.observable()
            });
        }
        vm.showJobCategories(roller.indexOf("Timelønnede") > -1);
        vm.showRoles(roller.indexOf("Sekretær") > -1 || roller.indexOf("økonom") > -1);
        console.log(vm.showRoles());
        vm.org(JSON.stringify(ko.toJS(vm.roller)));
    });
    $body.on("change", "#jobkategori", function () {
        vm.jobkategori().navn(this.options[this.selectedIndex].text);
    });
    $body.on("change", "#enhed", function () {
        vm.jobkategori().enhed().navn(this.options[this.selectedIndex].text);
    });
});