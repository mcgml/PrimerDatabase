(function () {
    'use strict';

    var controllerId = 'query';
    angular.module('app').controller(controllerId, ['common', 'datacontext', '$window', query]);

    function query(common, datacontext, $window) {

        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var logError = getLogFn(controllerId, 'error');
        var today = new Date();
        var M13F = "ACGATCAGCTA";
        var M13R = "TGTGTGTCTTG";

        var vm = this;

        vm.primerNameNodes = [];
        vm.primerSequenceNodes = [];
        vm.regionofInterestNodes = [];
        vm.assayInfoExpanded = [];
        vm.primerSequenceInfoExpanded = [];
        vm.primerSequenceOrderExpanded = [];
        vm.checkedAssayNodeId = [];
        vm.receivedOrderNodeId = [];
        vm.storedOrderNodeId = [];
        vm.bedFeatureForIGV = [];
        vm.primerSequenceToBuyID = [];
        vm.bedFilePath = [];
        vm.checkedAssayDesignedBy = [];

        vm.addCheckedBy = addCheckedBy;
        vm.addReceivedBy = addReceivedBy;
        vm.runPrimerNameQuery = runPrimerNameQuery;
        vm.runPrimerSequenceQuery = runPrimerSequenceQuery;
        vm.runTargetRegionQuery = runTargetRegionQuery;
        vm.downloadBEDFile = downloadBEDFile;
        vm.requestPrimer = requestPrimer;
        vm.launchIGV = launchIGV;
        vm.primerPurifications = [ "DESALT", "RP1", "HPLC", "PAGE" ];
        vm.primerUMScales = [0.025, 0.05, 0.2, 1, 10 , 15];
        vm.primerM13Tag = ["None", "M13F", "M13R"];
        vm.primerSuppliers = ["Sigma"];

        activate();

        //todo fix M13 bug
        //todo retired
        //todo archived
        //todo snp check record?
        //todo primer name query
        //todo email to supplier

        function activate() {
            var promises = [];
            common.activateController(promises, controllerId)
                .then(function () {});
        }

        function addCheckedBy(){

            if(vm.checkedAssayDesignedBy == $window.sessionStorage.username){
                logError("Assays cannot be checked by the designer");
                return;
            }

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

        function addReceivedBy(){

            if (vm.lotNumber == undefined || vm.lotNumber == ""){
                logError("Enter primer Lot Number");
                return;
            }

            if (vm.storageLocation == undefined || vm.storageLocation == ""){
                logError("Enter primer storage location");
                return;
            }

            if (vm.receivedOrderNodeId == undefined || vm.receivedOrderNodeId == ""){
                logError("You must order the primer before you can receive it");
                return;
            }

            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
            query += "MATCH (order:AwaitingReceipt) where id(order) = " + vm.receivedOrderNodeId + " ";
            query += "CREATE (user)<-[:RECEIVED_BY {Date:" + today.getTime() + "}]-(order) ";
            query += "CREATE (order)-[:HAS_LOCATION]->(location:StorageLocation {Location:\"" + vm.storageLocation + "\"}) ";
            query += "REMOVE order:AwaitingReceipt ";
            query += "SET order.LotNumber = \"" + vm.lotNumber + "\"";

            return datacontext.runAdhocQuery(query).then(function (result) {
                var cypherReturn = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

                vm.lotNumber = '';
                vm.storageLocation = '';
                vm.receivedOrderNodeId = '';
                runPrimerSequenceQuery(); //update fields

            });

        }

        function downloadBEDFile(){

            /*var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n";
            xml += "<Session genome=\"b37_gatk_2.8\" hasGeneTrack=\"true\" hasSequenceTrack=\"true\" locus=\"" + vm.targetRegion + "\" version=\"8\">\n";
            xml += "    <Resources>\n";
            xml += "        <Resource path=\"" + "igv_session.bed" + "\"/>\n";
            xml += "    </Resources>\n";
            xml += "    <Panel height=\"1190\" name=\"FeaturePanel\" width=\"2543\">\n";
            xml += "        <Track altColor=\"0,0,178\" autoScale=\"false\" color=\"0,0,178\" displayMode=\"COLLAPSED\" featureVisibilityWindow=\"-1\" fontSize=\"10\" id=\"Reference sequence\" name=\"Reference sequence\" sortable=\"false\" visible=\"true\"/>\n";
            xml += "        <Track altColor=\"0,0,178\" autoScale=\"false\" clazz=\"org.broad.igv.track.FeatureTrack\" color=\"0,0,178\" colorScale=\"ContinuousColorScale;0.0;1015.0;255,255,255;0,0,178\" displayMode=\"COLLAPSED\" featureVisibilityWindow=\"-1\" fontSize=\"10\" height=\"35\" id=\"b37_gatk_2.8_genes\" name=\"Gene\" renderer=\"BASIC_FEATURE\" sortable=\"false\" visible=\"true\" windowFunction=\"count\">\n";
            xml += "            <DataRange baseline=\"0.0\" drawBaseline=\"true\" flipAxis=\"false\" maximum=\"1015.0\" minimum=\"0.0\" type=\"LINEAR\"/>\n";
            xml += "        </Track>\n";
            xml += "        <Track altColor=\"0,0,178\" autoScale=\"false\" clazz=\"org.broad.igv.track.FeatureTrack\" color=\"0,0,178\" displayMode=\"EXPANDED\" featureVisibilityWindow=\"-1\" fontSize=\"10\" id=\"" + "igv_session.bed" + "\" name=\"" + "igv_session.bed" + "\" renderer=\"BASIC_FEATURE\" sortable=\"false\" visible=\"true\" windowFunction=\"count\"/>\n";
            xml += "    </Panel>\n";
            xml += "    <PanelLayout dividerFractions=\"0.004995836802664446\"/>\n";
            xml += "    <HiddenAttributes>\n";
            xml += "        <Attribute name=\"DATA FILE\"/>\n";
            xml += "        <Attribute name=\"DATA TYPE\"/>\n";
            xml += "        <Attribute name=\"NAME\"/>\n";
            xml += "    </HiddenAttributes>\n";
            xml += "</Session>\n";

            //write xml
            var blob = new Blob([xml]);
            saveAs(blob, "igv_session.xml");*/

            var today = new Date();
            var now = today.getTime();

            //create bedrecord
            vm.bedFilePath = now + ".bed";
            var bed = vm.bedFeatureForIGV.Contig + "\t" + (vm.bedFeatureForIGV.StartPos - vm.bedFeatureForIGV.primer1.length) + "\t" + (vm.bedFeatureForIGV.EndPos + vm.bedFeatureForIGV.primer2.length) + "\tamplicon\t0\t+\t" + vm.bedFeatureForIGV.StartPos + "\t" + vm.bedFeatureForIGV.EndPos + "\n";

            //write bed file
            var blob = new Blob([bed]);
            saveAs(blob, vm.bedFilePath);

            //load IGV
            setTimeout(function () {launchIGV()}, 100);

        }

        function launchIGV(){
            var myWindow = window.open("http://localhost:60151/load?file=/Users/ml/Downloads/" + vm.bedFilePath + "&locus=" + vm.targetRegion + "&genome=b37");
            myWindow.close();
        }

        function requestPrimer(){

            if (vm.newPrimerName == undefined || vm.newPrimerName == ""){
                logError('Enter a primer name');
                return;
            }

            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
            query += "MATCH (primer:Primer) where id(primer) = " + vm.primerSequenceToBuyID + " ";
            query += "CREATE (primer)-[:HAS_ORDER]->(order:Order :AwaitingOrder ";
            if (vm.selectedM13 == "M13F") query += ":M13F ";
            if (vm.selectedM13 == "M13R") query += ":M13R ";
            query += "{PrimerName:\"" + vm.newPrimerName + "\"";
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
            query += "OPTIONAL MATCH (assay)-[designedBy:DESIGNED_BY]->(designerUser:User) ";
            query += "OPTIONAL MATCH (assay)-[checker:CHECKED_BY]->(user:User) ";
            query += "return primer1, assay, primer2, checker, user, designedBy, designerUser;";

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
            query += "OPTIONAL MATCH (primer)-[:HAS_ORDER]->(m13f:M13F) ";
            query += "OPTIONAL MATCH (primer)-[:HAS_ORDER]->(m13r:M13R) ";
            query += "OPTIONAL MATCH (primer)-[:HAS_UPSTREAM_TARGET|:HAS_DOWNSTREAM_TARGET]->(assay:Assay) ";
            query += "OPTIONAL MATCH (order)-[:HAS_LOCATION]->(storageLocation:StorageLocation) ";
            query += "OPTIONAL MATCH (primer)-[enteredBy:ENTERED_BY]->(enterUser:User) ";
            query += "OPTIONAL MATCH (order)-[requestedBy:REQUESTED_BY]->(requesterUser:User) ";
            query += "OPTIONAL MATCH (order)-[receivedBy:RECEIVED_BY]->(receiveUser:User) ";
            query += "return primer, enteredBy, enterUser, receiveUser, receivedBy, requestedBy, requesterUser, order, storageLocation, m13f, m13r;";

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