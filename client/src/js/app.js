'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
 CodeMirror.defineSimpleMode("hg", {
    start: [
      { regex: /#/,    push: "tag", token: "tag" },
      { regex: /@/,    push: "user", token: "comment" }
    ],
    tag: [
      { regex: /\s/, pop: true, token: "tag" },
      { regex: /./, token: "tag" }
    ],
    user: [
      { regex: /\s/, pop: true, token: "comment" },
      { regex: /./, token: "comment" }
    ]
  });

angular
  .module('histograph', [
    'ui.router',
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
    USER_NOT_AUTHENTIFIED: 'user_not_authentified',
    API_PARAMS_CHANGED: 'api_params_changed',
    PAGE_CHANGED: 'page_changed'
  })
  .constant("VIZ", {
    TIMELINE: 'timeline'
  })
  .constant("MESSAGES", {
    LOADING: 'loading, please wait',
    LOADED: 'loaded',
    AUTH_REQUIRED: 'please connect with your credentials'
  })
  .config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");
    $stateProvider
      .state('index', {
        url: '/',
       
        templateUrl: 'templates/index.html',
        controller: 'IndexCtrl',
        reloadOnSearch: false,
      })
      
      .state('entity', {
        url: '/e/:id',
        templateUrl: 'templates/entity.html',
        controller: 'EntityCtrl',
        reloadOnSearch: false,
        resolve: {
          entity: function(EntityFactory, $stateParams) {
            return EntityFactory.get({
              id: $stateParams.id
            }).$promise;
          },
          persons: function(EntityRelatedFactory, $stateParams) {
            return EntityRelatedFactory.get({
              id: $stateParams.id,
              model: 'persons'
            }, {}).$promise;
          },
          resources: function(EntityRelatedFactory, $stateParams) {
            return EntityRelatedFactory.get({
              id: $stateParams.id,
              model: 'resources',
              limit: 10
            }, {}).$promise;
          }
        }
      })
       /*
        resources
        @todo
      */
      .state('resource', {
        url: '/r/:id',
        templateUrl: 'templates/resource.html',
        controller: 'ResourceCtrl',
        reloadOnSearch: false,
        resolve: {
          resource: function(ResourceFactory, $stateParams) {
            return ResourceFactory.get({
              id: $stateParams.id
            }).$promise;
          },
          resources: function(ResourceRelatedFactory, $stateParams) {
            return ResourceRelatedFactory.get({
              id: $stateParams.id,
              model: 'resource',
              limit: 10
            }).$promise;
          },
        }
      })
        .state('resource.inquiry', {
          url: '/inq/{inquiry_id:[0-9,]+}',
          templateUrl: 'templates/partials/inquiry.html',
          controller: 'InquiryCtrl',
          resolve: {
            inquiry: function(InquiryFactory, $stateParams) {
              return InquiryFactory.get({
                id: $stateParams.inquiry_id
              }).$promise;
            }
          }
        })
        .state('resource.inquiries', {
          url: '/inq',
          templateUrl: 'templates/partials/inquiries.html',
          controller: 'InquiriesCtrl',
          resolve: {
            inquiries: function(ResourceRelatedFactory, $stateParams) {
              return ResourceRelatedFactory.get({
                id: $stateParams.id,
                model: 'inquiry',
                limit: 10
              }).$promise;
            },
          }
        })
          .state('resource.inquiries.create', {
            url: '/create',
            templateUrl: 'templates/partials/inquiries.create.html',
            controller: 'InquiryCreateCtrl'
          })
          .state('resource.inquiries.createIssue', {
            url: '/create/{type:date|title}',
            templateUrl: 'templates/partials/issues.create.html',
            controller: 'IssueCreateCtrl'
          })
          
      /*
        collections
        @todo
      */    
      //.state('collections', {})
      //.state('collection', {})
      
      /*
        MISC
        @todo
      */    
      .state('neighbors', {
        abstract: true,
        url: '/neighbors/{ids:[0-9,]+}',
        templateUrl: 'templates/neighbors.html',
        controller: 'NeighborsCtrl',
        resolve: {
          allInBetween: function(SuggestFactory, $stateParams) {
            return SuggestFactory.allInBetween({
              ids: $stateParams.ids
            });
          }
        }
      })
        
        .state('neighbors.resources', {
          url: '/r',
          templateUrl: 'templates/partials/neighbors.html',
          controller: 'NeighborsResourcesCtrl',
        })
      
      .state('search', {
        url: '/search/{query:[^/]*}',
        templateUrl: 'templates/search.html',
        controller: 'SearchCtrl',
        resolve: {
          resources: function(SuggestFactory, $stateParams) {
            // clean limit here
            return SuggestFactory.getResources({
              query: $stateParams.query,
              limit: 10
            });
          },
          entities: function(SuggestFactory, $stateParams) {
            // clean limit here
            return SuggestFactory.getEntities({
              query: $stateParams.query,
              limit: 10
            });
          }
        }
      })
      .state('searchentity', {
        url: '/search/{query}/entity',
        templateUrl: 'templates/search.html',
        controller: 'SearchCtrl',
        resolve: {
          entities: function(SuggestFactory, $stateParams) {
            // clean limit here
            return SuggestFactory.getEntities({
              query: $stateParams.query,
              limit: 10
            });
          }
        }
      });
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
            $rootScope.$broadcast(EVENTS.USER_NOT_AUTHENTIFIED);
            $log.error('redirecting, authorization problems');
            // location.reload(true);
          }
          return $q.reject(rejection);
        }
      };
    });
  })
