(function () {
    'use strict';

    // Define the common module 
    // Contains services:
    //  - common
    //  - logger
    //  - spinner
    var commonModule = angular.module('common', []);

    // Must configure the common service and set its 
    // events via the commonConfigProvider
    commonModule.provider('commonConfig', function () {
        this.config = {
            // These are the properties we need to set
            //controllerActivateSuccessEvent: '',
            //spinnerToggleEvent: ''
        };

        this.$get = function () {
            return {
                config: this.config
            };
        };
    });

    commonModule.factory('common',
        ['$q', '$rootScope', '$timeout', 'commonConfig', 'logger', '$http', common]);

    function common($q, $rootScope, $timeout, commonConfig, logger, $http) {
        var throttles = {};

        var service = {
            // common angular dependencies
            $broadcast: $broadcast,
            $q: $q,
            $timeout: $timeout,
            $rootScope: $rootScope,
            // generic
            activateController: activateController,
            createSearchThrottle: createSearchThrottle,
            debouncedThrottle: debouncedThrottle,
            isNumber: isNumber,
            logger: logger, // for accessibility
            textContains: textContains,
            $http: $http,
            checkGenomicTargetForm : checkGenomicTargetForm,
            checkCypherLog : checkCypherLog,
            checkDNAIsIUPAC : checkDNAIsIUPAC
        };

        return service;

        function activateController(promises, controllerId) {
            return $q.all(promises).then(function (eventArgs) {
                var data = { controllerId: controllerId };
                $broadcast(commonConfig.config.controllerActivateSuccessEvent, data);
            });
        }

        function $broadcast() {
            return $rootScope.$broadcast.apply($rootScope, arguments);
        }

        function createSearchThrottle(viewmodel, list, filteredList, filter, delay) {
            // After a delay, search a viewmodel's list using 
            // a filter function, and return a filteredList.

            // custom delay or use default
            delay = +delay || 300;
            // if only vm and list parameters were passed, set others by naming convention 
            if (!filteredList) {
                // assuming list is named sessions, filteredList is filteredSessions
                filteredList = 'filtered' + list[0].toUpperCase() + list.substr(1).toLowerCase(); // string
                // filter function is named sessionFilter
                filter = list + 'Filter'; // function in string form
            }

            // create the filtering function we will call from here
            var filterFn = function () {
                // translates to ...
                // vm.filteredSessions 
                //      = vm.sessions.filter(function(item( { returns vm.sessionFilter (item) } );
                viewmodel[filteredList] = viewmodel[list].filter(function(item) {
                    return viewmodel[filter](item);
                });
            };

            return (function () {
                // Wrapped in outer IFFE so we can use closure 
                // over filterInputTimeout which references the timeout
                var filterInputTimeout;

                // return what becomes the 'applyFilter' function in the controller
                return function(searchNow) {
                    if (filterInputTimeout) {
                        $timeout.cancel(filterInputTimeout);
                        filterInputTimeout = null;
                    }
                    if (searchNow || !delay) {
                        filterFn();
                    } else {
                        filterInputTimeout = $timeout(filterFn, delay);
                    }
                };
            })();
        }

        function debouncedThrottle(key, callback, delay, immediate) {
            // Perform some action (callback) after a delay. 
            // Track the callback by key, so if the same callback 
            // is issued again, restart the delay.

            var defaultDelay = 1000;
            delay = delay || defaultDelay;
            if (throttles[key]) {
                $timeout.cancel(throttles[key]);
                throttles[key] = undefined;
            }
            if (immediate) {
                callback();
            } else {
                throttles[key] = $timeout(callback, delay);
            }
        }

        function isNumber(val) {
            // negative or positive
            return /^[-]?\d+$/.test(val);
        }

        function textContains(text, searchText) {
            return text && -1 !== text.toLowerCase().indexOf(searchText.toLowerCase());
        }

        function checkGenomicTargetForm(input){

            var obj = [];
            obj.error = false;

            //check and extract target region
            if (input == undefined || input == ""){
                obj.errorMessage = 'Enter a target region';
                obj.error = true;
                return obj;
            }

            var fields = input.split(/:|-/);

            if (fields.length != 3 || fields[0] == "" || fields[1] == "" || fields[2] == ""){
                obj.errorMessage = 'Target location format is chr:start-end';
                obj.error = true;
                return obj;
            }

            var prefix = input.substring(0, 3);

            if (prefix.toLowerCase() == "chr"){
                obj.errorMessage = 'Do not use the chr prefix';
                obj.error = true;
                return obj;
            }

            if (parseInt(fields[1]) > parseInt(fields[2])){
                obj.errorMessage = 'Coordinates should be ascending';
                obj.error = true;
                return obj;
            }

            return obj;

        }

        function checkCypherLog(input){

            var obj = [];
            obj.error = false;

            //check result
            if (input["error"] != null){

                var error = input["error"];
                var innerError = error["innerError"];
                var errorMessage = innerError["message"];

                obj.errorMessage = errorMessage;
                obj.error = true;

            }

            if (input["responseData"] != null){

                var response;
                var responseData = input["responseData"];

                for (var r in responseData){
                    response += r + ":" + responseData[r] + "\n";
                }

                obj.sucessMessage = response;
            }

            return obj;

        }

        function checkDNAIsIUPAC(input){

            var obj = [];
            obj.error = false;

            var upperCaseSequence = input.toUpperCase();

            if (input == "" || input == undefined){
                obj.error = true;
                obj.errorMessage = 'Please supply DNA sequence';
                return obj;
            }

            //check sequence for non-IUPAC
            for (var i = 0, len = input.length; i < len; i++) {

                if (upperCaseSequence[i] != 'A' &&
                    upperCaseSequence[i] != 'T' &&
                    upperCaseSequence[i] != 'G' &&
                    upperCaseSequence[i] != 'C' &&
                    upperCaseSequence[i] != 'U' &&
                    upperCaseSequence[i] != 'R' &&
                    upperCaseSequence[i] != 'Y' &&
                    upperCaseSequence[i] != 'S' &&
                    upperCaseSequence[i] != 'W' &&
                    upperCaseSequence[i] != 'K' &&
                    upperCaseSequence[i] != 'M' &&
                    upperCaseSequence[i] != 'B' &&
                    upperCaseSequence[i] != 'D' &&
                    upperCaseSequence[i] != 'H' &&
                    upperCaseSequence[i] != 'V' &&
                    upperCaseSequence[i] != 'N' ){

                    obj.error = true;
                    obj.errorMessage = 'DNA sequence contains non-IUPAC bases';

                    return obj;

                }

            }

            return obj;
        }
    }
})();