(function () {
    'use strict';

    // Organize the controller name and dependencies here for easy recognition
    var controllerId = 'create';
    angular.module('app').controller(controllerId, ['common', 'datacontext', '$window', createCtrl]);

    // This is our controller...  think of it as a controller with a view model in it
    function createCtrl(common, datacontext, $window) {

        // Organizing all of the variables and functions here allows us to get a quick look at
        // what the controller is doing
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(controllerId);
        var logError = getLogFn(controllerId, 'error');
        var today = new Date();

        var vm = this;

        vm.primerDesignerReturn = [];

        // Our event handlers
        vm.runPrimerDesigner = runPrimerDesigner;
        vm.addManualPrimer = addManualPrimer;
        
        // Call this function when our controller is loaded
        activate();

        function activate() {
            var promises = [];
            common.activateController(promises, controllerId)
                .then(function (){});
        }

        ///auto new designer primer
        function runPrimerDesigner(){

            //check input is correct
            var inputCheck = common.checkGenomicTargetForm(vm.newAutoRegionOfInterest);

            if (inputCheck.error){
                logError(inputCheck.errorMessage);
                return;
            }

            //activate spinner
            //TODO activate spinner

            return datacontext.runPrimerDesigner(vm.newAutoRegionOfInterest).then(function (result) {

                //deactivate spinner
                //TODO deactivate spinner

                vm.primerDesignerReturn = jQuery.parseJSON(result.data.stdout);

                if (vm.primerDesignerReturn.leftSequence == null || vm.primerDesignerReturn.leftTm == null || vm.primerDesignerReturn.rightSequence == null || vm.primerDesignerReturn.rightTm == null || vm.primerDesignerReturn.chromosome == null || vm.primerDesignerReturn.startPosition == null || vm.primerDesignerReturn.endPosition == null){
                    logError("Could not designer primers around the supplied target");
                    return;
                }

                var query = "CREATE (primer1:Primer {PrimerSequence:\"" + vm.primerDesignerReturn.leftSequence + "\", Tm:" + vm.primerDesignerReturn.leftTm + "}), ";
                query += "(primer2:Primer {PrimerSequence:\"" + vm.primerDesignerReturn.rightSequence + "\", Tm:" + vm.primerDesignerReturn.rightTm + "}), ";
                query += "(primer1)-[:HAS_DOWNSTREAM_TARGET]->(assay:Assay {Contig:\"" + vm.primerDesignerReturn.chromosome + "\", StartPos:toInt(" + vm.primerDesignerReturn.startPosition + "), EndPos:toInt(" + vm.primerDesignerReturn.endPosition + "), ReferenceGenome:\"GRCh37\"})<-[:HAS_UPSTREAM_TARGET]-(primer2);";

                //add upstream primer and order
                return datacontext.runAdhocQuery(query).then(function (result) {
                    var cypherReturn  = common.checkCypherLog(result.data);

                    if (cypherReturn.error){
                        logError(cypherReturn.errorMessage);
                    } else {
                        log("Operation Successful");
                        if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                    }

                });

            });

        }

        //add manual primer
        function addManualPrimer() {

            var upstreamProvided = false, downstreamProvided = false;
            var query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";

            //check upstream primer entry
            if (vm.newManualUpstreamPrimerSequence != undefined && vm.newManualUpstreamPrimerSequence != ""){
                upstreamProvided = true;

                var checkInput = common.checkDNAIsIUPAC(vm.newManualUpstreamPrimerSequence);
                if (checkInput.error){
                    logError("Upstream primer error: " + checkInput.errorMessage);
                    return;
                }

                //check Tm has been entered
                if (vm.newManualUpstreamPrimerTm == undefined || vm.newManualUpstreamPrimerTm == ""){
                    logError('Enter upstream primer Tm');
                    return;
                }

            }
            //check downstream primer entry
            if (vm.newManualDownstreamPrimerSequence != undefined && vm.newManualDownstreamPrimerSequence != ""){
                downstreamProvided = true;

                var checkInput = common.checkDNAIsIUPAC(vm.newManualDownstreamPrimerSequence);
                if (checkInput.error){
                    logError("Downstream primer error: " + checkInput.errorMessage);
                    return;
                }

                //check Tm has been entered
                if (vm.newManualDownstreamPrimerTm == undefined || vm.newManualDownstreamPrimerTm == ""){
                    logError('Enter downstream primer Tm');
                    return;
                }
            }

            if (upstreamProvided && downstreamProvided){

                //check and extract target region
                if (vm.newManualTargetRegion == undefined || vm.newManualTargetRegion == ""){
                    logError('Enter a target region');
                    return;
                } else {
                    var checkInput = common.checkGenomicTargetForm(vm.newManualTargetRegion);

                    if (checkInput.error){
                        logError(checkInput.errorMessage);
                        return;
                    }
                }

                var fields = vm.newManualTargetRegion.split(/:|-/);

                //add primer(s)
                query += "CREATE (primer1:Primer {PrimerSequence:\"" + vm.newManualUpstreamPrimerSequence.toUpperCase() + "\", Tm: " + vm.newManualUpstreamPrimerTm;
                if (vm.newManualUpstreamPrimerComments != undefined && vm.newManualUpstreamPrimerComments != "") query += ", Comments:\"" + vm.newManualUpstreamPrimerComments + "\"";
                //if (vm.newManualSNPDBExcluded != undefined && vm.newManualSNPDBExcluded != "") query += ", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"";
                query += "})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";

                query += "(primer2:Primer {PrimerSequence:\"" + vm.newManualDownstreamPrimerSequence.toUpperCase() + "\", Tm: " + vm.newManualDownstreamPrimerTm;
                if (vm.newManualDownstreamPrimerComments != undefined && vm.newManualDownstreamPrimerComments != "") query += ", Comments:\"" + vm.newManualDownstreamPrimerComments + "\"";
                //if (vm.newManualSNPDBExcluded != undefined && vm.newManualSNPDBExcluded != "") query += ", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"";
                query += "})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";

                query += "(primer1)-[:HAS_DOWNSTREAM_TARGET]->(assay:Assay {Contig:\"" + fields[0] + "\", StartPos:toInt(" + fields[1] + "), EndPos:toInt(" + fields[2] + "), ReferenceGenome:\"GRCh37\"})<-[:HAS_UPSTREAM_TARGET]-(primer2), ";
                query += "(assay)-[:DESIGNED_BY {Date:" + today.getTime() + "}]->(user);"

            } else if (upstreamProvided) {

                query += "CREATE (primer:Primer {PrimerSequence:\"" + vm.newManualUpstreamPrimerSequence.toUpperCase() + "\", Tm: " + vm.newManualUpstreamPrimerTm;
                if (vm.newManualUpstreamPrimerComments != undefined && vm.newManualUpstreamPrimerComments != "") query += ", Comments:\"" + vm.newManualUpstreamPrimerComments + "\"";
                //if (vm.newManualSNPDBExcluded != undefined && vm.newManualSNPDBExcluded != "") query += ", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"";
                query += "})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user);";

            } else if (downstreamProvided){

                query += "CREATE (primer:Primer {PrimerSequence:\"" + vm.newManualDownstreamPrimerSequence.toUpperCase() + "\", Tm: " + vm.newManualDownstreamPrimerTm;
                if (vm.newManualDownstreamPrimerComments != undefined && vm.newManualDownstreamPrimerComments != "") query += ", Comments:\"" + vm.newManualDownstreamPrimerComments + "\"";
                //if (vm.newManualSNPDBExcluded != undefined && vm.newManualSNPDBExcluded != "") query += ", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"";
                query += "})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user);";

            }

            return datacontext.runAdhocQuery(query).then(function (result) {
                var cypherReturn  = common.checkCypherLog(result.data);

                if (cypherReturn.error){
                    logError(cypherReturn.errorMessage);
                } else {
                    log("Operation Successful");
                    if (cypherReturn.successMessage != "" && cypherReturn.successMessage != undefined) log(cypherReturn.successMessage);
                }

            });

        }

    }

})();

