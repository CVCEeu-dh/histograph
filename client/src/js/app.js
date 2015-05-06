'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
angular
  .module('histograph', [
    'ngRoute',
    'ngResource',
    'ui.bootstrap',
    'ui.codemirror',
    'perfect_scrollbar'
  ])
  .config(function ($routeProvider, $httpProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'templates/index.html',
        controller: 'IndexCtrl'
      })
      .when('/r/:id', {
        templateUrl: 'templates/resource.html',
        controller: 'ResourceCtrl'
      })
      .when('/c/:id', {
        templateUrl: 'templates/collection.html',
        controller: 'CollectionCtrl',
        resolve: {
          collection: function(CollectionFactory, $route) {
            console.log('ohlala', $route.current.params.id);
            return CollectionFactory.get({id: $route.current.params.id}).$promise;
          }
        }
      })
  })
