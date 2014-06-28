"use strict";
function controller($scope, $http) {
    var format = "DD-MM-YYYY",
        roles = ["Sekretær", "økonom"],
        length = roles.length,
        role = "",
        i = 0;
    $scope.medarbejder = { roller: [] };
    $scope.$watchCollection("medarbejder.roller", function (roller) {
        if (angular.isDefined(roller) && angular.isArray(roller)) {
            $scope.showJobCategories = roller.indexOf("Timelønnede") > -1;
            $scope.showRoles = _.intersection(roller, roles).length;
            for (i = 0; i < length; i += 1) {
                role = roles[i];
                if (roller.indexOf(role) > -1) {
                    $scope.medarbejder.enheder = $scope.medarbejder.enheder || [];
                    if (!_.findWhere($scope.medarbejder.enheder, { rolle: role })) {
                        $scope.medarbejder.enheder.unshift({ rolle: role });
                    }
                } else {
                    var enhed = _.findWhere($scope.medarbejder.enheder, { rolle: role });
                    if (enhed) {
                        if ($scope.medarbejder.RowKey && confirm("Ved at fjerne denne rolle vil alle sine nuværende perioder være lukket i dag. Fortsæt?")) {
                            (enhed.enheder || []).forEach(function (e) {
                                if (!e.til || moment().isBefore(moment(e.til, format))) {
                                    e.til = moment().format(format);
                                }
                            });
                        }
                    }
                }
            }
        }
    });
    $scope.$watch("medarbejder", function (medarbejder) {
        if (angular.isDefined(medarbejder)) {
            $scope.org = JSON.stringify(medarbejder.enheder);
            $scope.job = JSON.stringify(medarbejder.jobkategorier);
        }
    }, true);
    $scope.$watch("showJobCategories", function (showJobCategories, oldVal) {
        if (!showJobCategories && oldVal) {
            if (confirm("Ved at fjerne denne rolle vil alle sine nuværende perioder være lukket i dag. Fortsæt?")) {
                $scope.medarbejder.jobkategorier.forEach(function (jobkategori) {
                    if (!jobkategori.til || moment().isBefore(moment(jobkategori.til, format))) {
                        jobkategori.til = moment().format(format);
                        jobkategori.enheder.forEach(function (e) {
                            if (!e.til || moment().isBefore(moment(e.til, format))) {
                                e.til = moment().format(format);
                            }
                        });
                    }
                });
            }
        } else if (showJobCategories && !$scope.medarbejder.RowKey) {
            $http.get("/medarbejder/delregnskaber").success(function (data) {
                $scope.delregnskaber = data;
            });
            $http.get("/medarbejder/steder").success(function (data) {
                $scope.steder = data;
            });
        }
    });
    $scope.$watch("jobkategorikode", function (jobkategorikode) {
        if (angular.isDefined(jobkategorikode)) {
            $scope.jobkategorinavn = _.findWhere($scope.jobkategorier, { uuid: jobkategorikode }).stilling;
            $http.get("/medarbejder/job/" + jobkategorikode).success(function (data) {
                $scope.pkats = data;
                if (data.length === 1) {
                    $scope.pkatkode = data[0].kode;
                    $scope.pkatnavn = data[0].navn;
                }
            });
        }
    });
    $scope.$watch("enhedkode", function (enhedkode) {
        if (angular.isDefined(enhedkode) && enhedkode) {
            $scope.enhednavn = _.findWhere($scope.enheder, { kode: enhedkode }).navn;
        }
    });
    $scope.$watch("delregnskabkode", function (delregnskabkode) {
        if (angular.isDefined(delregnskabkode) && delregnskabkode) {
            $scope.delregnskabnavn = _.findWhere($scope.delregnskaber, { kode: delregnskabkode }).navn;
        }
    });
    $scope.$watch("stedkode", function (stedkode) {
        if (angular.isDefined(stedkode) && stedkode) {
            $scope.stednavn = _.findWhere($scope.steder, { kode: stedkode }).navn;
        }
    });
    $scope.$watch("projekt", function (projekt) {
        if (angular.isDefined(projekt) && projekt) {
            $scope.projektkode = projekt.id;
            $scope.projektnavn = projekt.text;
        }
    });
    $scope.$watch("aktivitet", function (aktivitet) {
        if (angular.isDefined(aktivitet) && aktivitet) {
            $scope.aktivitetkode = aktivitet.id;
            $scope.aktivitetnavn = aktivitet.text;
        }
    });
    angular.element(document).ready(function () {
        $scope.medarbejder = angular.fromJson(angular.element("#medarbejder").val());
        $scope.enheder = angular.fromJson(angular.element("#enheder").val());
        $scope.jobkategorier = angular.fromJson(angular.element("#jobkategorier").val());
    });
    $scope.addJobCategory = function () {
        $scope.nyJobkategori = { };
    };
    $scope.showJobCategories = false;
    $scope.showRoles = false;
    $scope.addEnhed = function (enhed) {
        enhed.nyEnhed.fra = moment(enhed.nyEnhed.fra).format("DD-MM-YYYY");
        enhed.nyEnhed.til = enhed.nyEnhed.til ? moment(enhed.nyEnhed.til).format("DD-MM-YYYY") : null;
        enhed.nyEnhed.navne = enhed.nyEnhed.koder.map(function (kode) {
            return _.findWhere($scope.enheder, { kode: kode }).navn;
        });
        enhed.enheder = enhed.enheder || [];
        enhed.enheder.unshift(enhed.nyEnhed);
        enhed.nyEnhed = null;
    };
    $scope.remEnhed = function (enhed) {
        enhed.nyEnhed = null;
    };
    $scope.delEnhed = function (index, enhed) {
        enhed.enheder.splice(index, 1);
        enhed.nyEnhed = null;
    };
    $scope.addNewEnhed = function (enhed) {
        enhed.nyEnhed = { };
    };
    $scope.addJob = function (jobkategorier, jobkategori) {
        jobkategori.fra = moment(jobkategori.fra).format("DD-MM-YYYY");
        jobkategori.til = jobkategori.til ? moment(jobkategori.til).format("DD-MM-YYYY") : null;
        jobkategori.navn = _.findWhere($scope.jobkategorier, { uuid: jobkategori.kode }).stilling;
        jobkategorier.unshift(jobkategori);
        $scope.nyJobkategori = null;
    };
    $scope.remJob = function () {
        $scope.nyJobkategori = null;
    };
    $scope.addOrg = function (jobkategori) {
        jobkategori.enheder = jobkategori.enheder || [];
        jobkategori.enhed.fra = moment(jobkategori.enhed.fra).format("DD-MM-YYYY");
        jobkategori.enhed.til = jobkategori.enhed.til ? moment(jobkategori.enhed.til).format("DD-MM-YYYY") : null;
        jobkategori.enhed.navn = _.findWhere($scope.enheder, { kode: jobkategori.enhed.kode }).navn;
        jobkategori.enheder.unshift(jobkategori.enhed);
        jobkategori.enhed = null;
    };
    $scope.remOrg = function (jobkategori) {
        jobkategori.enhed = null;
    };
    $scope.delJob = function (jobkategorier, index) {
        jobkategorier.splice(index, 1);
    };
    $scope.attachEnhed = function (jobkategori) {
        jobkategori.enhed = { };
    };
    $scope.detachEnhed = function (enheder, index) {
        enheder.splice(index, 1);
    };
    $scope.nyJobkategori = null;
    $scope.enhed = null;
    $scope.uiprojekt = {
        minimumInputLength: 4,
        allowClear: true,
        ajax: {
            url: "/medarbejder/projekter",
            data: function (term) {
                return {
                    q: term
                };
            },
            results: function (data) {
                $scope.projekter = data;
                return { results: data };
            }
        }
    };
    $scope.uiaktivitet = {
        minimumInputLength: 4,
        allowClear: true,
        ajax: {
            url: "/medarbejder/aktiviteter",
            data: function (term) {
                return {
                    q: term
                };
            },
            results: function (data) {
                $scope.aktiviteter = data;
                return { results: data };
            }
        }
    };
//    $scope.$watch("default", function (value, old) {
//        if (value && !old) {
//            if (value) {
//                angular.element("select").attr("disabled", "disabled");
//            } else {
//                angular.element("select").removeAttr("disabled");
//            }
//            console.log(value);
//            angular.element("#projekt").select2("enable", !value);
//            angular.element("#aktivitet").select2("enable", !value);
//        }
//    });
}

angular.module("app", ["ui.bootstrap", "ui.select2"])
    .controller("ctrl", ["$scope", "$http", controller])
    .config(function (datepickerConfig, datepickerPopupConfig) {
        datepickerConfig.startingDay = 1;
        datepickerPopupConfig.datepickerPopup = "dd-MM-yyyy";
        datepickerPopupConfig.currentText = "I dag";
        datepickerPopupConfig.clearText = "Ryd";
        datepickerPopupConfig.closeText = "Udført";
});
