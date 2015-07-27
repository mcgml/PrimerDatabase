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
        vm.primerSequenceOrderExpanded = [];
        vm.checkedAssayNodeId = [];
        vm.bedFeatureForIGV = [];
        vm.primerSequenceToBuyID = [];

        vm.addCheckedBy = addCheckedBy;
        vm.runPrimerNameQuery = runPrimerNameQuery;
        vm.runPrimerSequenceQuery = runPrimerSequenceQuery;
        vm.runTargetRegionQuery = runTargetRegionQuery;
        vm.loadIGV = loadIGV;
        vm.requestPrimer = requestPrimer;
        vm.primerPurifications = [ "DESALT", "RP1", "HPLC", "PAGE" ];
        vm.primerUMScales = [0.025, 0.05, 0.2, 1, 10 , 15];
        vm.primerM13Tag = [];
        vm.primerSuppliers = ["Sigma"];

        activate();

        function activate() {
            var promises = [];
            common.activateController(promises, controllerId)
                .then(function () {});
        }

        function addCheckedBy(){

            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
            query += "MATCH (assay:Assay) where id(assay) = " + vm.checkedAssayNodeId + " ";
            query += "CREATE (user)<-[:CHECKED_BY {Date:" + today.getTime() + "}]-(assay);";

            return datacontext.runAdhocQuery(query).then(function (result) {
                var cypherReturn = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

                runTargetRegionQuery(); //update checked by field
            });

        }

        function loadIGV(){

        }

        function requestPrimer(){

            if (vm.newPrimerName == undefined || vm.newPrimerName == ""){
                logError('Enter a primer name');
                return;
            }

            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
            query += "MATCH (primer:Primer) where id(primer) = " + vm.primerSequenceToBuyID + " ";
            query += "CREATE (primer)-[:HAS_ORDER]->(order:Order :AwaitingOrder {PrimerName:\"" + vm.newPrimerName + "\"";
            if (vm.newPrimerFivePrimerMod != "" && vm.newPrimerFivePrimerMod != undefined) query += ", FivePrimeModification:\"" + vm.newPrimerFivePrimerMod + "\"";
            if (vm.newPrimerThreePrimerMod != "" && vm.newPrimerThreePrimerMod != undefined) query += ", ThreePrimerModification:\"" + vm.newPrimerThreePrimerMod + "\"";
            query += ", Purification:\"" + vm.selectedPurification + "\", Scale:" + vm.selectedScale + ", Supplier:\"" + vm.selectedSupplier + "\"}) ";
            query += "CREATE (order)-[:REQUESTED_BY {Date:" + today.getTime() + "}]->(user);";

            return datacontext.runAdhocQuery(query).then(function (result) {
                var cypherReturn = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }
            });

        }

        function runTargetRegionQuery() {

            //check target input is OK
            var checkInput = common.checkGenomicTargetForm(vm.targetRegion);

            if (checkInput.error){
                logError(checkInput.errorMessage);
                return;
            }

            var fields = vm.targetRegion.split(/:|-/);

            var query = "MATCH (primer1:Primer)-[:HAS_DOWNSTREAM_TARGET]->(assay:Assay)<-[:HAS_UPSTREAM_TARGET]-(primer2:Primer) where assay.Contig = \"" + fields[0] + "\" AND assay.StartPos <= toInt(" + fields[1] + ") AND assay.EndPos >= toInt(" + fields[2] + ") ";
            query += "OPTIONAL MATCH (assay)-[checker:CHECKED_BY]->(user:User) return primer1, assay, primer2, checker, user;";

            return datacontext.runAdhocQuery(query).then(function (result) {

                var cypherReturn = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

                return vm.regionofInterestNodes = result.data;
            });
        }

        function runPrimerSequenceQuery() {
            
            if (vm.primerSequence == undefined || vm.primerSequence == ""){
                logError('Enter a primer sequence');
                return;
            }

            var query = "MATCH (primer:Primer {PrimerSequence:\"" + vm.primerSequence + "\"}) ";
            query += "OPTIONAL MATCH (primer)-[:HAS_ORDER]->(order:Order) ";
            query += "OPTIONAL MATCH (primer)-[:HAS_UPSTREAM_TARGET|:HAS_DOWNSTREAM_TARGET]->(assay:Assay) ";
            query += "OPTIONAL MATCH (order)-[:HAS_LOCATION]->(storageLocation:StorageLocation) ";
            query += "OPTIONAL MATCH (primer)-[enteredBy:ENTERED_BY]->(enterUser:User) ";
            query += "OPTIONAL MATCH (order)-[requestedBy:REQUESTED_BY]->(requesterUser:User) ";
            query += "OPTIONAL MATCH (order)-[receivedBy:RECEIVED_BY]->(receiveUser:User) ";
            query += "return primer, enteredBy, enterUser, receiveUser, requestedBy, requesterUser, order;";

            return datacontext.runAdhocQuery(query).then(function (result) {

                var cypherReturn = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

                return vm.primerSequenceNodes = result.data;
            });

        }

        function runPrimerNameQuery() {

            if (vm.primerName == undefined || vm.primerName == ""){
                logError('Enter a primer sequence');
                return;
            }

            var query = "MATCH (order:Order {PrimerName:\"" + vm.primerName + "\"})-[:HAS_ORDER]->(primer:Primer) ";
            query += "OPTIONAL MATCH (primer)-[:HAS_UPSTREAM_TARGET|:HAS_DOWNSTREAM_TARGET]->(assay:Assay) ";
            query += "OPTIONAL MATCH (order)-[:HAS_LOCATION]->(storageLocation:StorageLocation) ";
            query += "OPTIONAL MATCH (primer)-[enteredBy:ENTERED_BY]->(enterUser:User) ";
            query += "OPTIONAL MATCH (order)-[requestedBy:REQUESTED_BY]->(requesterUser:User) ";
            query += "OPTIONAL MATCH (order)-[receivedBy:RECEIVED_BY]->(receiveUser:User) ";
            query += "return primer, enteredBy, enterUser, receiveUser, requestedBy, requesterUser, order;";

            return datacontext.runAdhocQuery(query).then(function (result) {

                var cypherReturn = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

                return vm.primerSequenceNodes = result.data;
            });

        }

    }
})();