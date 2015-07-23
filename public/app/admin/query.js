(function () {
    'use strict';

    var controllerId = 'query';
    angular.module('app').controller(controllerId, ['common', 'datacontext', '$window', query]);

    function query(common, datacontext, $window) {

        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var logError = getLogFn(controllerId, 'error');
        var today = new Date();

        var vm = this;

        vm.primerNameNodes = [];
        vm.primerSequenceNodes = [];
        vm.regionofInterestNodes = [];
        vm.assayInfoExpanded = [];
        vm.primerSequenceInfoExpanded = [];
        vm.checkedAssayNodeId = [];
        vm.bedFeatureForIGV = [];

        vm.addCheckedBy = addCheckedBy;
        vm.runPrimerNameQuery = runPrimerNameQuery;
        vm.runPrimerSequenceQuery = runPrimerSequenceQuery;
        vm.checkCypherLog = checkCypherLog;
        vm.runTargetRegionQuery = runTargetRegionQuery;
        vm.launchIGV = launchIGV;

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

        function addCheckedBy(){
            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
            query += "MATCH (assay:Assay) where id(assay) = " + vm.checkedAssayNodeId + " ";
            query += "CREATE (user)<-[:CHECKED_BY {Date:" + today.getTime() + "}]-(assay);";

            return datacontext.runAdhocQuery(query).then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                runTargetRegionQuery(); //update checked by field
            });
        }

        function launchIGV(){
            window.open("http://localhost:60151/load?file=" +  + "&locus=" + bedFeatureForIGV.assay.data.Contig + ":" + bedFeatureForIGV.assay.data.StartPos + "-" + bedFeatureForIGV.assay.data.EndPos + "&genome=b37");

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
            query += "OPTIONAL MATCH (primer)-[hasOrder:HAS_ORDER]->(order:Order) ";
            query += "OPTIONAL MATCH (primer)-[hasTarget:HAS_TARGET]->(assay:Assay) ";
            query += "OPTIONAL MATCH (order)-[hasLocation:HAS_LOCATION]->(storageLocation:StorageLocation) ";
            query += "OPTIONAL MATCH (order)-[orderedBy:ORDERED_BY]->(orderUser:User) ";
            query += "OPTIONAL MATCH (order)-[receivedBy:RECEIVED_BY]->(receiveUser:User) ";
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

            var query = "MATCH (upstreamPrimer:UpstreamPrimer)-[:HAS_TARGET]->(assay:Assay)<-[:HAS_TARGET]-(downstreamPrimer:DownstreamPrimer) where assay.Contig = \"" + fields[0] + "\" AND assay.StartPos <= toInt(" + fields[1] + ") AND assay.EndPos >= toInt(" + fields[2] + ") ";
                query += "OPTIONAL MATCH (assay)-[checker:CHECKED_BY]->(user:User) return upstreamPrimer, assay, downstreamPrimer, checker, user;";

            return datacontext.runAdhocQuery(query).then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
                return vm.regionofInterestNodes = result.data;
            });
        }

    }
})();