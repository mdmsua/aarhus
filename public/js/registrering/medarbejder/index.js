"use strict";

$(function () {
    $("#period").on("change", function () {
        var period = $(this).val(),
            pathname = location.pathname,
            lock = parseInt(pathname.substring(pathname.indexOf("/", pathname.indexOf("lock")) + 1), 10);
        location.replace("/registrering/lock/" + lock + "/" + (period === "0" ? "" : period));
    });
});

function controller($scope, $http, $filter) {
    var pathname = location.pathname,
        lock = parseInt(pathname.substring(pathname.indexOf("/", pathname.indexOf("lock")) + 1), 10);
    angular.element(document).ready(function () {
        $scope.registreringer = angular.fromJson(angular.element("#registreringer").val());
        $scope.indstillinger = angular.fromJson(angular.element("#indstillinger").val());
        $scope.jobkategorier = angular.fromJson(angular.element("#jobkategorier").val());
        $scope.enheder = angular.fromJson(angular.element("#enheder").val());
        console.log($scope.enheder);
        $scope.medarbejdere = angular.fromJson(angular.element("#medarbejdere").val());
    });
    $scope.setStatus = function (status) {
        $scope.status = status;
    };
    $scope.getCount = function (status) {
        return $scope.registreringer ? $filter("filter")($scope.registreringer, { jobkategorikode: $scope.jobkategori, enhedkode: $scope.enhed, lock: status }).length : 0;
    };
    $scope.remove = function (registrering) {
        if (confirm("Vil du slette denne registrering?")) {
            $http.delete("/registrering/" + registrering.RowKey).success(function () {
                location.reload();
            });
        }
    };
    $scope.$watch("indstillinger", function (indstillinger) {
        if (indstillinger) {
            //$http.post("/registrering/lock/0/indstillinger", { data: angular.toJson(indstillinger) });
        }
    }, true);
    $scope.$watch("jobkategori", function (jobkategori) {
        if ($scope.indstillinger) {
            $scope.indstillinger.Jobkategori = !jobkategori;
        }
    });
    $scope.$watch("enhed", function (enhed) {
        if ($scope.indstillinger) {
            $scope.indstillinger.Enhed = !enhed;
        }
    });
    $scope.$watch("medarbejder", function (medarbejder) {
        if ($scope.medarbejder) {
            $scope.indstillinger.Medarbejder = !medarbejder;
        }
    });
    $scope.$watch("all", function (all) {
        if ($scope.registreringer) {
            $scope.registreringer.forEach(function (registrering) {
                $scope.check[registrering.RowKey] = all;
            });
        }
    });
    $scope.check = { };
    $scope.status = lock;
    $scope.lock = lock;
}

angular.module("app", ["ui.bootstrap", "ui.select2"])
    .controller("ctrl", ["$scope", "$http", "$filter", controller])
    .config(function (datepickerConfig, datepickerPopupConfig) {
        datepickerConfig.startingDay = 1;
        datepickerPopupConfig.datepickerPopup = "dd-MM-yyyy";
        datepickerPopupConfig.currentText = "I dag";
        datepickerPopupConfig.clearText = "Ryd";
        datepickerPopupConfig.closeText = "Udført";
    });
