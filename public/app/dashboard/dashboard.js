(function () {
    'use strict';
    var controllerId = 'dashboard';
    angular.module('app').controller(controllerId, ['common', 'datacontext', '$window', '$location', dashboard]);

    function dashboard(common, datacontext, $window, $location) {
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var logError = getLogFn(controllerId, 'error');
        var $http = common.$http;
        var today = new Date();

        var vm = this;
        vm.news = {
            title: 'Hot Towel Angular',
            description: 'Hot Towel Angular is a SPA template for Angular developers.'
        };
        vm.message = {};
        vm.people = [];
        vm.title = 'Dashboard';
        vm.credentials = {};
        vm.primersReadyForOrder = [];
        vm.primersAwaitingReceipt = [];
        vm.primersReadyForOrderSelected = [];
        vm.primersReadyForOrderAllSelected = [];
        vm.primersAwaitingReceiptSelected = [];
        vm.primersAwaitingReceiptAllSelected = [];

        vm.initPrimersForOrder = initPrimersForOrder;
        vm.initPrimersForReceipt = initPrimersForReceipt;
        vm.orderPrimers = orderPrimers;

        activate();

        function activate() {
            var promises = [];
            common.activateController(promises, controllerId)
                .then(function () {});
        }


        //this is used to parse the profile
        function url_base64_decode(str) {
            var output = str.replace('-', '+').replace('_', '/');
            switch (output.length % 4) {
            case 0:
                break;
            case 2:
                output += '==';
                break;
            case 3:
                output += '=';
                break;
            default:
                throw 'Illegal base64url string!';
            }
            return window.atob(output); //polifyll https://github.com/davidchambers/Base64.js
        }

        vm.signin = function () {
            $http.post('/signin', vm.credentials).success(function (response) {
                // If successful we assign the response to the global user model
                $window.sessionStorage.token = response.token;
                $window.isAuthenticated = true;
                var encodedProfile = response.token.split('.')[1];
                var profile = JSON.parse(url_base64_decode(encodedProfile));
                $window.sessionStorage.username = profile.username;
                common.$rootScope.$broadcast('loginSuccess', {});
                log('Welcome ' + $window.sessionStorage.username + ' you are now logged in.');
                // And redirect to the index page
                $location.path('/');

                //load primers
                vm.initPrimersForOrder();
                vm.initPrimersForReceipt();
                
            }).error(function (response) {
                vm.message.user = response.message;
            });
        };

        //order primers
        function orderPrimers() {

            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
            query += "MATCH (order:AwaitingOrder)<-[:HAS_ORDER]-(primer:Primer) ";
            query += "CREATE (order)-[:ORDERED_BY {Date:" + today.getTime() + "}]->(user) ";
            query += "SET order:AwaitingReceipt remove order:AwaitingOrder ";
            query += "return order, primer;";

            return datacontext.runAdhocQuery(query).then(function (result) {

                var cypherReturn  = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

                //TODO order primers from supplier


                vm.initPrimersForOrder();
                vm.initPrimersForReceipt();
            });

        }

        ///check for primers ready to order at page load
        function initPrimersForOrder() {
            return datacontext.runAdhocQuery("MATCH (user:User)<-[requestedBy:REQUESTED_BY]-(order:AwaitingOrder)<-[:HAS_ORDER]-(primer:Primer) return order, primer, user, requestedBy;").then(function (result) {

                var cypherReturn  = common.checkCypherLog(result.data);

                if (cypherReturn.error) {
                    logError(cypherReturn.errorMessage);
                }

                return vm.primersRequestedForOrder = result.data;
            });
        }

        ///check for primers ready to Receipt at page load
        function initPrimersForReceipt() {
            return datacontext.runAdhocQuery("MATCH (user:User)<-[orderedBy:ORDERED_BY]-(order:AwaitingReceipt)<-[:HAS_ORDER]-(primer:Primer) return order, primer, user, orderedBy;").then(function (result) {

                var cypherReturn  = common.checkCypherLog(result.data);

                if (cypherReturn.error) {
                    logError(cypherReturn.errorMessage);
                }

                return vm.primersAwaitingReceipt = result.data;
            });
        }

        //populate on refresh
        if ($window.sessionStorage.username != undefined){
            vm.initPrimersForOrder();
            vm.initPrimersForReceipt();
        }

    }
})();
