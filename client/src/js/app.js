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
  })
