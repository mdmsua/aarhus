"use strict";
function controller($scope, $http) {
    $scope.medarbejder = { roller: [] };
    $scope.$watchCollection("medarbejder.roller", function (roller) {
        if (angular.isDefined(roller) && angular.isArray(roller)) {
            var i;
            $scope.showJobCategories = roller.indexOf("Timelønnede") > -1;
            $scope.showRoles = roller.indexOf("Sekretær") > -1 || roller.indexOf("økonom") > -1;
            if (roller.indexOf("Sekretær") > -1) {
                if (!_.findWhere($scope.medarbejder.enheder, { rolle: "Sekretær"})) {
                    $scope.medarbejder.enheder.unshift({ rolle: "Sekretær" });
                }
            } else {
                if (_.findWhere($scope.medarbejder.enheder, { rolle: "Sekretær"})) {
                    for (i = 0; i < $scope.medarbejder.enheder.length; i++) {
                        if ($scope.medarbejder.enheder[i].rolle === "Sekretær") {
                            $scope.medarbejder.enheder.splice(i, 1);
                        }
                    }
                }
            }
            if (roller.indexOf("økonom") > -1) {
                if (!_.findWhere($scope.medarbejder.enheder, { rolle: "økonom"})) {
                    $scope.medarbejder.enheder.unshift({ rolle: "økonom" });
                }
            } else {
                if (_.findWhere($scope.medarbejder.enheder, { rolle: "økonom"})) {
                    for (i = 0; i < $scope.medarbejder.enheder.length; i++) {
                        if ($scope.medarbejder.enheder[i].rolle === "økonom") {
                            $scope.medarbejder.enheder.splice(i, 1);
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
            console.log($scope.org);
            console.log($scope.job);
        }
    }, true);
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
