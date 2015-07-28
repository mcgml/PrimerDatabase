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

            var bedFilePath = "/Users/ml/Documents/Projects/PrimerDesigner/Mo/Mo.bed";
            var locus = "14:102467141-102468527";

            var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n";
            xml += "<Session genome=\"b37_gatk_2.8\" hasGeneTrack=\"true\" hasSequenceTrack=\"true\" locus=\"" + locus + "\" version=\"8\">\n";
            xml += "    <Resources>\n";
            xml += "        <Resource path=\"" + bedFilePath + "\"/>\n";
            xml += "    </Resources>";
            xml += "    <Panel height=\"1190\" name=\"FeaturePanel\" width=\"2543\">";
            xml += "        <Track altColor=\"0,0,178\" autoScale=\"false\" color=\"0,0,178\" displayMode=\"COLLAPSED\" featureVisibilityWindow=\"-1\" fontSize=\"10\" id=\"Reference sequence\" name=\"Reference sequence\" sortable=\"false\" visible=\"true\"/>";
            xml += "        <Track altColor=\"0,0,178\" autoScale=\"false\" clazz=\"org.broad.igv.track.FeatureTrack\" color=\"0,0,178\" colorScale=\"ContinuousColorScale;0.0;1015.0;255,255,255;0,0,178\" displayMode=\"COLLAPSED\" featureVisibilityWindow=\"-1\" fontSize=\"10\" height=\"35\" id=\"b37_gatk_2.8_genes\" name=\"Gene\" renderer=\"BASIC_FEATURE\" sortable=\"false\" visible=\"true\" windowFunction=\"count\">\n";
            xml += "            <DataRange baseline=\"0.0\" drawBaseline=\"true\" flipAxis=\"false\" maximum=\"1015.0\" minimum=\"0.0\" type=\"LINEAR\"/>/n";
            xml += "        </Track>\n";
            xml += "        <Track altColor=\"0,0,178\" autoScale=\"false\" clazz=\"org.broad.igv.track.FeatureTrack\" color=\"0,0,178\" displayMode=\"EXPANDED\" featureVisibilityWindow=\"-1\" fontSize=\"10\" id=\"/Users/ml/Documents/Projects/PrimerDesigner/Mo/Primers.bed\" name=\"Primers.bed\" renderer=\"BASIC_FEATURE\" sortable=\"false\" visible=\"true\" windowFunction=\"count\"/>\n";
            xml += "    </Panel>\n";
            xml += "    <PanelLayout dividerFractions=\"0.004995836802664446\"/>\n";
            xml += "    <HiddenAttributes>\n";
            xml += "        <Attribute name=\"DATA FILE\"/>\n";
            xml += "        <Attribute name=\"DATA TYPE\"/>\n";
            xml += "        <Attribute name=\"NAME\"/>\n";
            xml += "    </HiddenAttributes>\n";
            xml += "</Session>\n";

            var blob = new Blob([xml], {
                type: "text/plain;charset=utf-8;",
            });
            saveAs(blob, "igv_session.xml");

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