(function () {
    angular.module('app').controller('ctrl', ['$scope', '$location', ctrl]);

    function ctrl($scope, $location) {
        var properties = [
          '`FIRST_NAME', '`LAST_NAME', '`SSN', '`SALARY_GROUP_NUMBER', '`PRIMARY_EMAIL', '`PERSONAL_EMAIL', '`TELEPHONE_NUMBER'
        ];
        var props = [
            'firstName', 'lastName', 'ssn', 'salaryGroupNumber', 'primaryEmail', 'personalEmail', 'telephoneNumber'
        ];
        var url = $location.absUrl();
        var exec = /\d+$/.exec(url);
        var employee = exec ? new Employee(exec[0]) : new Employee();
        $scope.employee = employee;
        $scope.getHistory = function () {
            $scope.history = Array.apply(null, Array(12)).map(function (_, i) {
               return {
                   date: new Date(Number(Math.random() * 1e11)),
                   actions: [{
                         user: 'dmm',
                         property: properties[i],
                         prev: '',
                         next: $scope.employee[props[i]]
                     }]
               }
            });
        };
    }

    function Employee(ssn) {
        if (ssn) {
            this.firstName = 'John';
            this.lastName = 'Smith';
            this.ssn = ssn;
            this.salaryGroupNumber = 100;
            this.primaryEmail = "john.smith@contoso.com";
            this.personalEmail = "johnsmith@personal.com";
            this.telephoneNumber = "+1 (234) 456-78-90";
            this.jobCategory = {
                id: 1,
                name: "Sample job category",
                validFrom: "01/01/2014",
                validTo: "01/04/2014"
            }
        }
    }

    Employee.prototype.name = function() {
        return (this.firstName || '') + ' ' + (this.lastName || '');
    }
})();