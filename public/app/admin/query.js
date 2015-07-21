(function () {
    'use strict';

    var controllerId = 'query';
    angular.module('app').controller(controllerId, ['common', 'datacontext', query]);

    function query(common, datacontext) {

        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var logError = getLogFn(controllerId, 'error');
        var dateEpoch = new Date(0);

        var vm = this;

        vm.primerNameNodes = [];
        vm.primerSequenceNodes = [];
        vm.regionofInterestNodes = [];
        vm.assayInfoExpanded = [];
        vm.primerSequenceInfoExpanded = [];

        vm.addCheckedBy = addCheckedBy;
        vm.runPrimerNameQuery = runPrimerNameQuery;
        vm.runPrimerSequenceQuery = runPrimerSequenceQuery;
        vm.checkCypherLog = checkCypherLog;
        vm.runTargetRegionQuery = runTargetRegionQuery;

        activate();

        function activate() {
            var promises = [];
            common.activateController(promises, controllerId)
                .then(function () {});
        }

        function checkCypherLog(){
            
            //check result
            if (vm.neo4jReturn["error"] != null){

                var error = vm.neo4jReturn["error"];
                var innerError = error["innerError"];
                var errorMessage = innerError["message"]

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

        function addCheckedBy(){
        }
        
        function runPrimerNameQuery() {
            
            if (vm.primerName == undefined || vm.primerName == ""){
                logError('Enter a primer name');
                return;
            }

            return datacontext.runAdhocQuery("MATCH (order:Order {PrimerName:\"" + vm.primerName + "\"})<-[:HAS_ORDER]-(primer:Primer) return order, primer;").then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                return vm.primerNameNodes = result.data;
            });
        }

        function runPrimerSequenceQuery() {
            
            if (vm.primerSequence == undefined || vm.primerSequence == ""){
                logError('Enter a primer sequence');
                return;
            }

        var query = "MATCH (primer:Primer {PrimerSequence:\"" + vm.primerSequence + "\"}) ";
            query += "MATCH (primer)-[hasOrder:HAS_ORDER]->(order:Order) ";
            query += "MATCH (primer)-[hasTarget:HAS_TARGET]->(assay:Assay) ";
            query += "MATCH (order)-[hasLocation:HAS_LOCATION]->(storageLocation:StorageLocation) ";
            query += "MATCH (order)-[orderedBy:ORDERED_BY]->(orderUser:User) ";
            query += "MATCH (order)-[receivedBy:RECEIVED_BY]->(receiveUser:User) ";
            query += "return primer, receiveUser, orderUser, hasOrder, order;";

            return datacontext.runAdhocQuery(query).then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                return vm.primerSequenceNodes = result.data;
            });
        }

        function runTargetRegionQuery() {

            if (vm.targetRegion == undefined || vm.targetRegion == ""){
                logError('Enter a target region');
                return;
            }

            var fields = vm.targetRegion.split(/:|-/);
            var prefix = vm.targetRegion.substring(0, 3);

            if (fields.length != 3){
                logError('Target location format is chr:start-end');
                return;
            }

            if (prefix == "chr"){
                logError('Do not use the chr prefix');
                return;
            }

            if (parseInt(fields[1]) > parseInt(fields[2])){
                logError('Coordinates should be ascending');
                return;
            }

            var query = "MATCH (leftPrimer:Primer)-[:HAS_TARGET]->(assay:Assay)<-[:HAS_TARGET]-(rightPrimer:Primer) where assay.Contig = toString(" + fields[0] + ") AND assay.StartPos <= toInt(" + fields[1] + ") AND assay.EndPos >= toInt(" + fields[0] + ") ";
                query += "MATCH (assay)-[checker:CHECKED_BY]->(user:User) return leftPrimer, assay, rightPrimer, checker, user;";
            return datacontext.runAdhocQuery(query).then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                return vm.regionofInterestNodes = result.data;
            });
        }

    }
})();