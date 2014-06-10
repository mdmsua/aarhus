"use strict";

function controller($scope, $http) {
    var cpr = "",
        pathname = location.pathname,
        lock = parseInt(pathname.substring(pathname.indexOf("/", pathname.indexOf("lock")) + 1), 10),
        getAccounting = function () {
            var projektkode = $scope.registrering.projektkode,
                aktivitetkode = $scope.registrering.aktivitetkode;
            if (projektkode && aktivitetkode && !$scope.registrering.RowKey) {
                $http.get("/registrering/delregnskab/" + projektkode + "/" + aktivitetkode).success(function (delregnskaber) {
                    if (delregnskaber.length === 1) {
                        $scope.registrering.delregnskabkode = delregnskaber[0].kode;
                        $scope.registrering.delregnskabnavn = delregnskaber[0].navn;
                    } else {
                        $scope.alert = "Gyldigt kombination af udvalgt projekt og aktivitet eksisterer ikke";
                    }
                });
            }
        };
    angular.element(document).ready(function () {
        $scope.registreringer = angular.fromJson(angular.element("#registreringer").val());
        $scope.registrering = angular.fromJson(angular.element("#registrering").val());
        $scope.medarbejdere = angular.fromJson(angular.element("#medarbejdere").val());
        console.log($scope.medarbejdere);
        cpr = angular.element("#cpr").val();
        console.log(cpr);
        if (lock === 0) {
            $http.get("/registrering/cpr/" + cpr).success(function (jobkategorier) {
                $scope.jobkategorier = jobkategorier;
                if (jobkategorier.length === 1 && !$scope.registrering.RowKey) {
                    $scope.registrering.jobkategorikode = jobkategorier[0].kode;
                    $scope.registrering.jobkategorinavn = jobkategorier[0].navn;
                }
            });
        }
    });
    $scope.visibleTemplate = false;
    $scope.toggleTemplate = function () {
        $scope.visibleTemplate = !$scope.visibleTemplate;
    };
    $scope.lock = lock;
    $scope.$watch("registrering.medarbejderkode", function (medarbejderkode) {
        if (medarbejderkode) {
            $http.get("/registrering/cpr/" + medarbejderkode).success(function (jobkategorier) {
                $scope.jobkategorier = jobkategorier;
                if (jobkategorier.length === 1 && !$scope.registrering.RowKey) {
                    $scope.registrering.jobkategorikode = jobkategorier[0].kode;
                    $scope.registrering.jobkategorinavn = jobkategorier[0].navn;
                }
            });
        }
    });
    $scope.$watch("registrering.jobkategorikode", function (jobkategorikode) {
        if (jobkategorikode) {
            $http.get("/registrering/jobkategori/" + jobkategorikode + "/" + (cpr || $scope.registrering.medarbejderkode)).success(function (data) {
                $scope.enheder = data.organizations;
                $scope.lkos = data.lkos;
                if (data.organizations.length === 1 && !$scope.registrering.RowKey) {
                    $scope.registrering.enhedkode = data.organizations[0].kode;
                    $scope.registrering.enhednavn = data.organizations[0].navn;
                }
                if (data.lkos.length === 1 && !$scope.registrering.RowKey) {
                    $scope.registrering.lkokode = data.lkos[0].kode;
                    $scope.registrering.lkonavn = data.lkos[0].navn;
                }
            });
            if (!$scope.registrering.RowKey) {
                $scope.registrering.jobkategorinavn = _.findWhere($scope.jobkategorier, { kode: jobkategorikode }).navn;
            }
        } else if ($scope.registrering && !$scope.registrering.RowKey) {
            delete $scope.enheder;
            delete $scope.registrering.enhedkode;
        }
    });
    $scope.$watch("registrering.enhedkode", function (enhedkode) {
        if (enhedkode) {
            $http.get("/registrering/enhed/" + enhedkode).success(function (steder) {
                if (!$scope.registrering.RowKey) {
                    $scope.registrering.stedkode = steder[0].kode;
                    $scope.registrering.stednavn = steder[0].navn;
                }
            });
            if (!$scope.registrering.RowKey) {
                $scope.registrering.enhednavn = _.findWhere($scope.enheder, { kode: enhedkode }).navn;
            }
        } else if ($scope.registrering && !$scope.registrering.RowKey) {
            delete $scope.registrering.enhednavn;
            delete $scope.registrering.stedkode;
        }
    });
    $scope.$watch("registrering.stedkode", function (stedkode) {
        if (stedkode) {
            $http.get("/registrering/sted/" + stedkode).success(function (combo) {
                $scope.projekter = combo.projects;
                $scope.aktiviteter = combo.activities;
                if (combo.projects.length === 1 && !$scope.registrering.RowKey) {
                    $scope.registrering.projektkode = combo.projects[0].kode;
                    $scope.registrering.projektnavn = combo.projects[0].navn;
                }
                if (combo.activities.length === 1 && !$scope.registrering.RowKey) {
                    $scope.registrering.aktivitetkode = combo.activities[0].kode;
                    $scope.registrering.aktivitetnavn = combo.activities[0].navn;
                }
            });
        } else if ($scope.registrering && !$scope.registrering.RowKey) {
            delete $scope.registrering.stednavn;
            delete $scope.projekter;
            delete $scope.aktiviteter;
            delete $scope.registrering.projektkode;
            delete $scope.registrering.aktivitetkode;
        }
    });
    $scope.$watch("registrering.projektkode", function (projektkode) {
        if (projektkode && !$scope.registrering.RowKey) {
            getAccounting();
            $scope.registrering.projektnavn = _.findWhere($scope.projekter, { RowKey: projektkode }).navn;
        } else if ($scope.registrering && !$scope.registrering.RowKey) {
            delete $scope.registrering.projektnavn;
        }
    });
    $scope.$watch("registrering.aktivitetkode", function (aktivitetkode) {
        if (aktivitetkode && !$scope.registrering.RowKey) {
            getAccounting();
            $scope.registrering.aktivitetnavn = _.findWhere($scope.aktiviteter, { RowKey: aktivitetkode }).navn;
        } else if ($scope.registrering && !$scope.registrering.RowKey) {
            delete $scope.registrering.aktivitetnavn;
        }
    });
    $scope.submit = function (url) {
        if (url) {
            angular.element("form").attr("action", url + "/" + $scope.registrering.RowKey).submit();
        }
        angular.element("form").submit();
    };
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
