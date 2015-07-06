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
    'perfect_scrollbar'
  ])
  .constant("EVENTS", {
    USE_USER: 'use_user',
    API_PARAMS_CHANGED: 'api_params_changed'
  })
  .constant("VIZ", {
    TIMELINE: 'timeline'
  })
  .config(function ($routeProvider, $httpProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'templates/index.html',
        controller: 'IndexCtrl',
        reloadOnSearch: false
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
              model: 'resource',
              limit: 10
            }).$promise;
          },
        }
      })
      .when('/r/:id/inquiries', {
        templateUrl: 'templates/inquiries.html',
        controller: 'InquiriesCtrl',
        resolve: {
          resource: function(ResourceFactory, $route) {
            return ResourceFactory.get({
              id: $route.current.params.id
            }).$promise;
          },
          inquiries: function(ResourceRelatedFactory, $route) {
            return ResourceRelatedFactory.get({
              id: $route.current.params.id,
              model: 'inquiry',
              limit: 10
            }).$promise;
          },
        }
      })
      .when('/r/:id/new/inquiry', {
        templateUrl: 'templates/inquiry.new.html',
        controller: 'InquiryCreateCtrl',
        resolve: {
          resource: function(ResourceFactory, $route) {
            return ResourceFactory.get({
              id: $route.current.params.id
            }).$promise;
          }
        }
      })
      .when('/i/:inquiry_id', {
        templateUrl: 'templates/inquiry.html',
        controller: 'InquiryCtrl',
        resolve: {
          inquiry: function(InquiryFactory, $route) {
            return InquiryFactory.get({
              id: $route.current.params.inquiry_id
            }).$promise;
          }
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
        templateUrl: 'templates/neighbors.html',
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
  .config(function ($httpProvider) {
    $httpProvider.interceptors.push(function ($q, $log, $rootScope, EVENTS) {
      return {
        response: function(response) {
          if(response.data.user)
            $rootScope.$broadcast(EVENTS.USE_USER, response.data.user);
          return response
        },
        responseError: function(rejection) {
          if(rejection.status === 403) {
            $log.error('redirecting, authorization problems');
            // location.reload(true);
          }
          return $q.reject(rejection);
        }
      };
    });
  })
