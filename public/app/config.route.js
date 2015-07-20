(function () {
    'use strict';

    var app = angular.module('app');

    // Collect the routes
    app.constant('routes', getRoutes());
    
    // Configure the routes and route resolvers
    app.config(['$routeProvider', 'routes', routeConfigurator]);
    function routeConfigurator($routeProvider, routes) {

        routes.forEach(function (r) {
            $routeProvider.when(r.url, r.config);
        });
        $routeProvider.otherwise({ redirectTo: '/' });
    }

    // Define the routes 
    function getRoutes() {
        return [
            {
                url: '/',
                config: {
                    templateUrl: 'app/dashboard/dashboard.html',
                    title: 'dashboard',
                    settings: {
                        nav: 1,
                        content: '<i class="fa fa-dashboard"></i> Dashboard'
                    }
                }
            },  
            {
                url: '/admin/create',
                config: {
                    title: 'create',
                    templateUrl: 'app/admin/create.html',
                    settings: {
                        nav: 2,
                        content: '<i class="fa fa-tasks"></i> Manage Assays'
                    }
                }
            },
            {
                url: '/admin/query',
                config: {
                    title: 'query',
                    templateUrl: 'app/admin/query.html',
                    settings: {
                        nav: 5,
                        content: '<i class="fa fa-crosshairs"></i> Search Assays'
                    }
                }
            },
            {
                url: '/login/unauth',
                config: {
                    title: 'unauth',
                    templateUrl: 'app/login/unauth.html',
                    settings: {
                        content: '<i class="fa fa-crosshairs"></i> Unauthorized Access'
                    }
                }
            }
        ];
    }
})()
