(function () {
    'use strict';
    var controllerId = 'dashboard';
    angular.module('app').controller(controllerId, ['common', 'datacontext', '$window', '$location', dashboard]);

    function dashboard(common, datacontext, $window, $location) {
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var logError = getLogFn(controllerId, 'error');
        var $http = common.$http;

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
        vm.neo4jReturn = [];

        vm.initPrimersForOrder = initPrimersForOrder;
        vm.initPrimersForReceipt = initPrimersForReceipt;
        vm.orderPrimers = orderPrimers;
        vm.checkCypherLog = checkCypherLog;

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

        function checkCypherLog(){

            //check result
            if (vm.neo4jReturn["error"] != null){

                var error = vm.neo4jReturn["error"];
                var innerError = error["innerError"];
                var errorMessage = innerError["message"];

                logError(errorMessage);
                logError("Operation unsucessful");

            } else {

                var responseData = vm.neo4jReturn[responseData];

                for (var r in responseData){
                    log(r + ":" + responseData[r]);
                }

                log("Operation successful");
            }

        }

        //order primers
        function orderPrimers() {
            return datacontext.runAdhocQuery("").then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                return vm.primersReadyForOrder = result.data;
            });

            vm.initPrimersForOrder();
            vm.initPrimersForReceipt();
        }

        function removeFroOrder(){
            return datacontext.runAdhocQuery("").then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                return vm.primersReadyForOrder = result.data;
            });

            vm.initPrimersForOrder();
            vm.initPrimersForReceipt();
        }

        ///check for primers ready to order at page load
        function initPrimersForOrder() {
            return datacontext.runAdhocQuery("MATCH (user:User)<-[orderedBy:ORDERED_BY]-(order:AwaitingOrder)<-[:HAS_ORDER]-(primer:Primer) return order, primer, user, orderedBy;").then(function (result) {
                return vm.primersReadyForOrder = result.data;
            });
        }

        ///check for primers ready to Receipt at page load
        function initPrimersForReceipt() {
            return datacontext.runAdhocQuery("MATCH (user:User)<-[orderedBy:ORDERED_BY]-(order:AwaitingReceipt)<-[:HAS_ORDER]-(primer:Primer) return order, primer, user, orderedBy;").then(function (result) {
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
