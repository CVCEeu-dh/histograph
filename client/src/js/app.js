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
    'ngCookies',
    'ui.bootstrap',
    'ui.codemirror',
    // 'mgcrea.ngStrap'
    //'perfect_scrollbar'
  ])
  .config(function ($routeProvider, $httpProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'templates/index.html',
        controller: 'IndexCtrl'
      })
      .when('/r/:id', {
        templateUrl: 'templates/resource.html',
        controller: 'ResourceCtrl',
        resolve: {
          resource: function(ResourceFactory, $route) {
            return ResourceFactory.get({
              id: $route.current.params.id
            }).$promise;
          },
          resources: function(ResourceRelatedFactory, $route) {
            return ResourceRelatedFactory.get({
              id: $route.current.params.id,
              model: 'resources'
            }, {}).$promise;
          },
        }
      })
      .when('/e/:id', {
        templateUrl: 'templates/entity.html',
        controller: 'EntityCtrl',
        resolve: {
          entity: function(EntityFactory, $route) {
            return EntityFactory.get({
              id: $route.current.params.id
            }).$promise;
          },
          persons: function(EntityRelatedFactory, $route) {
            return EntityRelatedFactory.get({
              id: $route.current.params.id,
              model: 'persons'
            }, {}).$promise;
          },
          resources: function(EntityRelatedFactory, $route) {
            return EntityRelatedFactory.get({
              id: $route.current.params.id,
              model: 'resources'
            }, {}).$promise;
          }
        }
      })
      .when('/c/:id', {
        templateUrl: 'templates/collection.html',
        controller: 'CollectionCtrl',
        resolve: {
          collection: function(CollectionFactory, $route) {
            return CollectionFactory.get({
              id: $route.current.params.id
            }).$promise;
          },
          resources: function(CollectionRelatedFactory, $route) {
            return CollectionRelatedFactory.get({
              id: $route.current.params.id,
              model: 'resources'
            }, {}).$promise;
          }
        }
      })
      .when('/ap/:ids', {
        templateUrl: 'templates/all-shortest-paths.html',
        controller: 'AllShortestPathsCtrl',
        resolve: {
          allShortestPaths: function(SuggestFactory, $route) {
            return SuggestFactory.allShortestPaths({
              ids: $route.current.params.ids
            });
          }
        }
      })
      .when('/neighbors/:ids', {
        templateUrl: 'templates/neighbors.html',
        controller: 'NeighborsCtrl',
        resolve: {
          neighbors: function(SuggestFactory, $route) {
            return SuggestFactory.neighbors({
              ids: $route.current.params.ids
            });
          }
        }
      })
      .when('/search/:query', {
        templateUrl: 'templates/search.html',
        controller: 'SearchCtrl',
        resolve: {
          resources: function(SuggestFactory, $route) {
            // clean limit here
            return SuggestFactory.getResources({
              query: $route.current.params.query,
              limit: 30
            });
          }
        }
      })
  })
