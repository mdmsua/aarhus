angular.module('app', ['ngResource', 'localytics.directives', 'ui.bootstrap']).controller('ctrl', ['$scope', '$resource', '$http', function($scope, $resource, $http) {
    $scope.stikos = $resource('/api/stiko').query();
    $scope.pkats = $resource('/api/pkat').query();
    $scope.lkos = $resource('/api/lko').query();
    $scope.categories = "AER bidrag,Professor,Forskningsprofessor,Professor med særlige opgaver,Forskningsprofessor (MSO),Statsobducent og professor,Lektor,Forskningslektor,Seniorforsker,Studielektor,Vicestatsobducent,Docent,Seniorrådgiver,Projektseniorforsker,Adjunkt,Forskningsadjunkt,Adjunkt med srærlige opgaver,Studieadjunkt,Undervisningsadjunkt,Post doc.,Forsker,Projektforsker,Amanuensis,Udenlandsk lektor,Forskningsstipendiat,Forskningsassistent,Klinisk assistent,Videnskabelig assistent,Afdelingstandæge,Kliniske lærer. odont,Videreuddannelsesstilling, Odontologi,Kandidatstipendiat,Lønnet ph.d-stipendat,SU ph.d-stipendiat,Klinisk professor,Klinisk lektor,Ekstern lektor,Undervisningsassistent,SUL Undervisningsassistent,Klinisk lærer, sygehusafd.,Klinisk lærer, almen medicin,Ph.d. timeløn,Studenterunderviser,Censur int./ekst.ankekommision,Bedømmer,Gæsteforelæser/gæstelærer,Kursuslærer (postgraduat),Praktikantvejleder,Videnskabelig medhjælp,Administrativ leder,Dekan,Institutleder,Prodekan,Administrativt personale,Fuldmægtig,Kontorfunkt. korrespond.,Biblioteksfunktioner,Driftsleder,Teknisk AC-personale og journalist,Ledende tandlæge,Tekniker,Gartner/dyrepasser,Bygningsdrift,Undervisning, SKT,Laborant,It-funktioner,Rengøringsass./Sanitør,Elev/lærling,PKU-elev,Øvrige praktikanter,Studerende, HK,Studentermedhjælp, SUL,Studenterprogrammør,Eksamensvagt,Studenterstudievejl/faglige vejl,Tutor,Andet medhjælp,Scholarstipendiat,Trainee,Opholdsstipendiat,Andet stipendiat,Ingeniørdocent,Gæsteingeniørdocent,Lektor (Ing.),Gæstelektor (Ing.),Adjunkt (Ing.),Amanuensis,Indlån VIP, professorniv.,Indlån VIP, postdoc. niv.,Indlån VIP, før postdoc. niv,Indlån PHD,Indlån TAP,Adjungeret professor,Adjungeret lektor,Ekstern VIP,Emeritus VIP,Ekstern underviser DVIP,Gæste PHD,Ekstern TAP,Forskningsaktiv studerende,Ekstern Andet,Særlig vederlæggelse,Kompensation til forsøgspersoner,Efterindtægt (udbt. til efterlevende),Bestyrelse,Skal afklares".split(',');
    $scope.salaryClasses = Array.apply(null, Array(100)).map(function (_, i) {if (i > 0) return i;});
    $scope.salaryForms = Array.apply(null, Array(6)).map(function (_, i) {if (i > 0) return i;});
    $scope.salaryLevels = Array.apply(null, Array(56)).map(function (_, i) {if (i > 0) return i;});
    $scope.configurations = [{
        name: 'Sample configuration',
        category: 'Professor',
        lko: '10013',
        pkat: '101',
        stiko: '3763',
        sc: 10,
        sf: 5,
        sl: 50
    }];
    $scope.getHistory = function () {
        $http.get('/api/history').then(function(response) {
            var history = [];
            var data = response.data;
            data.forEach(function (period) {
                var values = [];
                var index = Number((Math.random() * 10).toFixed());
                values.push({
                    key: 'LKO',
                    value: $scope.lkos[index].kode + ' (' + $scope.lkos[index].navn + ')'
                });
                values.push({
                    key: 'PKAT',
                    value: $scope.pkats[index].nummer + ' (' + $scope.pkats[index].navn + ')'
                });
                values.push({
                    key: 'STIKO',
                    value: $scope.stikos[index].nummer + ' (' + $scope.stikos[index].stilling + ')'
                });
                values.push({
                    key: 'Salary class',
                    value: $scope.salaryClasses[index] || 1
                });
                values.push({
                    key: 'Salary form',
                    value: $scope.salaryForms[index] || 1
                });
                values.push({
                    key: 'Salary level',
                    value: $scope.salaryLevels[index] || 1
                });
                period.values = values;
            });
            $scope.history = data;
        });
    };
}]);