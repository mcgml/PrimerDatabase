(function () {
    'use strict';
    var controllerId = 'dashboard';
    angular.module('app').controller(controllerId, ['common', 'datacontext', '$window', '$location', dashboard]);

    function dashboard(common, datacontext, $window, $location) {
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
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
                // And redirect to the index page
                $location.path('/');
            }).error(function (response) {
                vm.message.user = response.message;
            });
        }

        //order primers
        function orderPrimers() {
            return datacontext.runAdhocQuery("MATCH (o:AwaitingOrder) set o : AwaitingReceipt remove o : AwaitingOrder").then(function (result) {
                return vm.primersReadyForOrder = result.data;
            });
        }

        ///check for primers ready to order at page load
        function initPrimersForOrder() {
            return datacontext.runAdhocQuery("MATCH (order:AwaitingOrder)<-[:HAS_ORDER]-(primer:Primer) return order, primer;").then(function (result) {
                return vm.primersReadyForOrder = result.data;
            });
        }

        ///check for primers ready to Receipt at page load
        function initPrimersForReceipt() {
            return datacontext.runAdhocQuery("MATCH (order:AwaitingReceipt)<-[:HAS_ORDER]-(primer:Primer) return order, primer;").then(function (result) {
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
