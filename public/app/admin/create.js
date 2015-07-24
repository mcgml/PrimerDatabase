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

        //store cypher return in JSON
        vm.neo4jReturn = [];
        vm.primerDesignerReturn = [];

        // Our event handlers
        vm.checkCypherLog = checkCypherLog;
        vm.runPrimerDesigner = runPrimerDesigner;
        vm.addManualPrimer = addManualPrimer;
        
        // Call this function when our controller is loaded
        activate();

        function activate() {
            var promises = [];
            common.activateController(promises, controllerId)
                .then(function (){
                });
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

        ///auto new deigner primer
        function runPrimerDesigner(){

            //check and extract target region
            if (vm.newAutoRegionOfInterest == undefined || vm.newAutoRegionOfInterest == ""){
                logError('Enter a target region');
                return;
            }

            var fields = vm.newAutoRegionOfInterest.split(/:|-/);
            var prefix = vm.newAutoRegionOfInterest.substring(0, 3);

            if (fields.length != 3){
                logError('Target location format is chr:start-end');
                return;
            }

            if (prefix.toUpperCase() == "CHR"){
                logError('Do not use the chr prefix');
                return;
            }

            if (parseInt(fields[1]) > parseInt(fields[2])){
                logError('Coordinates should be ascending');
                return;
            }

            vm.newAutoRegionOfInterest = "Running..."; //TODO activate spinner

            return datacontext.runPrimerDesigner(fields[0] + "\t" + fields[1] + "\t" + fields[2]).then(function (result) {
                
                vm.newAutoRegionOfInterest = "Done!"; //todo deactivate spinner

                vm.primerDesignerReturn = jQuery.parseJSON(result.data.stdout);

                if (vm.primerDesignerReturn.leftSequence == null || vm.primerDesignerReturn.leftTm == null || vm.primerDesignerReturn.rightSequence == null ||
                    vm.primerDesignerReturn.rightTm == null || vm.primerDesignerReturn.chromosome == null || vm.primerDesignerReturn.startPosition == null || vm.primerDesignerReturn.endPosition == null){
                    logError("Could not designer primers around the supplied target");
                    return;
                }

                var query = "CREATE (primer1:Primer {PrimerSequence:\"" + vm.primerDesignerReturn.leftSequence + "\", Tm:" + vm.primerDesignerReturn.leftTm + "}), ";
                query += "(primer2:Primer {PrimerSequence:\"" + vm.primerDesignerReturn.rightSequence + "\", Tm:" + vm.primerDesignerReturn.rightTm + "}), ";
                query += "(primer1)-[:HAS_DOWNSTREAM_TARGET]->(assay:Assay {Contig:\"" + vm.primerDesignerReturn.chromosome + "\", StartPos:toInt(" + vm.primerDesignerReturn.startPosition + "), EndPos:toInt(" + vm.primerDesignerReturn.endPosition + "), ReferenceGenome:\"GRCh37\"})<-[:HAS_UPSTREAM_TARGET]-(primer2);";

                //add upstream primer and order
                return datacontext.runAdhocQuery(query).then(function (result) {
                    vm.neo4jReturn = result.data;
                    checkCypherLog();
                });

            });

        }

        //add manual primer
        function addManualPrimer() {

            var query;
            var upstreamProvided = false, downstreamProvided = false;

            //check upstream primer entry
            if (vm.newManualUpstreamPrimerSequence != undefined && vm.newManualUpstreamPrimerSequence != ""){
                upstreamProvided = true;

                //check upstream primer for non-IUPAC
                for (var i = 0, len = vm.newManualUpstreamPrimerSequence.length; i < len; i++) {

                    if (vm.newManualUpstreamPrimerSequence[i] != 'A' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'T' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'G' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'C' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'U' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'R' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'Y' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'S' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'W' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'K' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'M' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'B' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'D' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'H' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'V' &&
                        vm.newManualUpstreamPrimerSequence[i] != 'N' ){
                            logError('Upstream primer sequence contains non-IUPAC bases');
                            return; 
                    }

                }

            }
            //see if downstream primer was provided
            if (vm.newManualDownstreamPrimerSequence != undefined && vm.newManualDownstreamPrimerSequence != ""){
                downstreamProvided = true;

                //check primer for non-IUPAC
                for (var i = 0, len = vm.newManualDownstreamPrimerSequence.length; i < len; i++) {

                    if (vm.newManualDownstreamPrimerSequence[i] != 'A' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'T' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'G' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'C' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'U' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'R' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'Y' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'S' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'W' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'K' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'M' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'B' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'D' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'H' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'V' &&
                        vm.newManualDownstreamPrimerSequence[i] != 'N' ){
                            logError('Downstream primer sequence contains non-IUPAC bases');
                            return; 
                    }
                }
            }

            if (upstreamProvided && downstreamProvided){

                //check and extract target region
                if (vm.newManualTargetRegion == undefined || vm.newManualTargetRegion == ""){
                    logError('Enter a target region');
                    return;
                }
                var fields = vm.newManualTargetRegion.split(/:|-/);
                var prefix = vm.newManualTargetRegion.substring(0, 3);

                if (fields.length != 3){
                    logError('Target location format is chr:start-end');
                    return;
                }

                if (prefix.toUpperCase() == "CHR"){
                    logError('Do not use the chr prefix');
                    return;
                }

                if (parseInt(fields[1]) > parseInt(fields[2])){
                    logError('Coordinates should be ascending');
                    return;
                }

                query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
                query += "CREATE (primer1:Primer {PrimerSequence:\"" + vm.newManualUpstreamPrimerSequence + "\", Tm: " + vm.newManualUpstreamPrimerTm + ", Comments:\"" + vm.newManualUpstreamPrimerComments + "\", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";
                query += "(primer2:Primer {PrimerSequence:\"" + vm.newManualDownstreamPrimerSequence + "\", Tm: " + vm.newManualDownstreamPrimerTm + ", Comments:\"" + vm.newManualDownstreamPrimerComments + "\", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";
                query += "(primer1)-[:HAS_DOWNSTREAM_TARGET]->(assay:Assay {Contig:\"" + fields[0] + "\", StartPos:toInt(" + fields[1] + "), EndPos:toInt(" + fields[2] + "), ReferenceGenome:\"GRCh37\"})<-[:HAS_UPSTREAM_TARGET]-(primer2), ";
                query += "(assay)-[:DESIGNED_BY {Date:" + today.getTime() + "}]->(user);"

            } else if (upstreamProvided) {

                query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
                query += "CREATE (primer:Primer {PrimerSequence:\"" + vm.newManualUpstreamPrimerSequence + "\", Tm: " + vm.newManualUpstreamPrimerTm + ", Comments:\"" + vm.newManualUpstreamPrimerComments + "\", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user);";

            } else if (downstreamProvided){
                
                query = "MATCH (user:User {UserName:\"" + $window.sessionStorage.username + "\"}) ";
                query += "(primer:Primer {PrimerSequence:\"" + vm.newManualDownstreamPrimerSequence + "\", Tm: " + vm.newManualDownstreamPrimerTm + ", Comments:\"" + vm.newManualDownstreamPrimerComments + "\", SNPDB:\"" + vm.newManualSNPDBExcluded + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user);";

            }

            return datacontext.runAdhocQuery(query).then(function (result) {
                vm.neo4jReturn = result.data;
                checkCypherLog();
            });

        }

    }

})();

