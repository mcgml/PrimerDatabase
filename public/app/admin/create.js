(function () {
    'use strict';

    // Organize the controller name and dependencies here for easy recognition
    var controllerId = 'create';
    angular.module('app').controller(controllerId, ['common', 'datacontext', createCtrl]);

    // This is our controller...  think of it as a controller with a view model in it
    function createCtrl(common, datacontext) {

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

        //add new deigner primer
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

            if (prefix == "chr"){
                logError('Do not use the chr prefix');
                return;
            }

            if (parseInt(fields[1]) > parseInt(fields[2])){
                logError('Coordinates should be ascending');
                return;
            }

            vm.newAutoRegionOfInterest = "Running..."; //todo activate spinner

            return datacontext.runPrimerDesigner(fields[0] + "\t" + fields[1] + "\t" + fields[2]).then(function (result) {
                
                vm.newAutoRegionOfInterest = "Done!"; //todo deactivate spinner
                vm.primerDesignerReturn = jQuery.parseJSON(result.data.stdout);

                var query = "MATCH (user:User {FullName:\"" + "Matthew Lyon" + "\"}) ";
                query += "CREATE (primer1:Primer {PrimerSequence:\"" + vm.primerDesignerReturn.leftSequence + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";
                query += "(primer2:Primer {PrimerSequence:\"" + vm.primerDesignerReturn.rightSequence + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";
                query += "(primer1)-[:HAS_TARGET]->(assay:Assay {Contig:\"" + vm.primerDesignerReturn.chromosome + "\", StartPos:toInt(" + vm.primerDesignerReturn.startPosition + "), EndPos:toInt(" + vm.primerDesignerReturn.endPosition + "), ReferenceGenome:\"GRCh37.75\"})<-[:HAS_TARGET]-(primer2), ";
                query += "(assay)<-[:DESIGNED_BY {Date:" + today.getTime() + "}]-(user);"

                //add upstream primer and order
                return datacontext.runAdhocQuery(query).then(function (result) {
                    vm.neo4jReturn = result.data;
                    checkCypherLog();
                    return;
                });

            });

        }

        //add manual primer
        function addManualPrimer() {

            //check upstream primer entry
            if (vm.newManualUpstreamPrimerSequence == undefined || vm.newManualUpstreamPrimerSequence == ""){
                logError('Enter an upstream primer sequence');
                return;
            }
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
            //see if downstream primer was provided
            if (vm.newManualDownstreamPrimerSequence != undefined && vm.newManualDownstreamPrimerSequence != ""){

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

                    if (prefix == "chr"){
                        logError('Do not use the chr prefix');
                        return;
                    }

                    if (parseInt(fields[1]) > parseInt(fields[2])){
                        logError('Coordinates should be ascending');
                        return;
                    }

                var query = "MATCH (user:User {FullName:\"" + "Matthew Lyon" + "\"}) ";
                    query += "CREATE (primer1:Primer {PrimerSequence:\"" + vm.newManualUpstreamPrimerSequence + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";
                    query += "(primer2:Primer {PrimerSequence:\"" + vm.newManualDownstreamPrimerSequence + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user), ";
                    query += "(primer1)-[:HAS_TARGET]->(assay:Assay {Contig:\"" + fields[0] + "\", StartPos:toInt(" + fields[1] + "), EndPos:toInt(" + fields[2] + "), ReferenceGenome:\"GRCh37.75\"})<-[:HAS_TARGET]-(primer2), ";
                    query += "(assay)<-[:DESIGNED_BY {Date:" + today.getTime() + "}]-(user);"

                    //add upstream primer and order
                    return datacontext.runAdhocQuery(query).then(function (result) {
                        vm.neo4jReturn = result.data;
                        checkCypherLog();
                        return;
                    });

            } else {

                var query = "MATCH (user:User {FullName:\"" + "Matthew Lyon" + "\"}) ";
                    query += "CREATE (primer1:Primer {PrimerSequence:\"" + vm.newManualUpstreamPrimerSequence + "\"})-[:ENTERED_BY {Date:" + today.getTime() + "}]->(user);";

                //add upstream primer and order
                return datacontext.runAdhocQuery(query).then(function (result) {
                    vm.neo4jReturn = result.data;
                    checkCypherLog();
                    return;
                });

            }

        }

    }

})();