/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
// CodeMirror.defineSimpleMode("hg", {
//   start: [
//     { regex: /#/,    push: "tag", token: "tag" },
//     { regex: /@/,    push: "user", token: "comment" }
//   ],
//   tag: [
//     { regex: /\s/, pop: true, token: "tag" },
//     { regex: /./, token: "tag" }
//   ],
//   user: [
//     { regex: /\s/, pop: true, token: "comment" },
//     { regex: /./, token: "comment" }
//   ]
// });

angular
  .module('histograph', [
    // core
    'ui.router',
    'ngRoute',
    'ngResource',
    'ngSanitize',
    'ngCookies',

    // analytics
    'angular-google-analytics',

    'ui.bootstrap',
    'pascalprecht.translate',// angular-translate
    // 'ui.codemirror',
    'perfect_scrollbar',
    'LocalStorageModule',
    'masonry',
    'angular-tour'
  ])
  .constant('LOCALES', {
    'locales': {
      'en_US': 'English'
    },
    'preferredLocale': 'en_US'
  })
  .constant("EVENTS", {
    USE_USER: 'use_user',
    USER_NOT_AUTHENTIFIED: 'user_not_authentified',
    API_PARAMS_CHANGED: 'api_params_changed',
    API_FILTERS_CHANGED: 'api_filters_changed',
    PAGE_CHANGED: 'page_changed',
    ANNOTATOR_SHOWN: 'annotationEditorShown',
    ANNOTATOR_HIDDEN: 'annotationEditorHidden',
    INFINITE_SCROLL: 'infinite_scroll',
    // proper angular events (directives needs to be alerted)
    LOCATION_CHANGE_START: 'location_change_start',
    STATE_CHANGE_SUCCESS: 'state_change_success',

    STATE_VIEW_CONTENT_LOADED: 'state_view_content_loaded',
    // sigma spefcific events
    SIGMA_SET_ITEM: 'sigma_set_item',
    // start tour
    START_GUIDED_TOUR: 'start_guided_tour',
  })
  .constant("VIZ", {
    TIMELINE: 'timeline'
  })
  .constant("MESSAGES", {
    LOADING: 'loading, please wait',
    LOADED: 'loaded',
    AUTH_REQUIRED: 'please connect with your credentials'
  })
  .constant("ORDER_BY", {
    RELEVANCE: {
      label: 'relevance',
      value: 'relevance'
    },
    
    CLOSEST_DATE: {
      label: 'date (closest)',
      value: '-date'
    },

    ASC_DATE: {
      label: 'date (oldest first)',
      value: 'date'
    },

    DESC_DATE: {
      label: 'date (closest first)',
      value: '-date'
    }
    
  })
  /*
    Angular-translate configs
    Cfr. https://scotch.io/tutorials/internationalization-of-angularjs-applications
  */
  .config(function ($translateProvider) {
    // $translateProvider.useMissingTranslationHandlerLog();
    $translateProvider.useSanitizeValueStrategy('sanitize');
    $translateProvider.useStaticFilesLoader({
        prefix: 'locale/locale-',// path to translations files
        suffix: '.json'// suffix, currently- extension of the translations
    });
    $translateProvider.preferredLanguage('en_US');// is applied on first load
    
    //@ todo guided tour provider
  })
  /*
    Angular analytics config
  */
  .config(function (AnalyticsProvider, SETTINGS) {
    if(SETTINGS.analytics.account)
      AnalyticsProvider
        .setAccount(SETTINGS.analytics.account)
        .setDomainName(SETTINGS.analytics.domainName || 'none')
        .trackUrlParams(true)
        // .logAllCalls(true)
        .setPageEvent('$stateChangeSuccess');
  })
  /*
    Local-storage module config. cfr
    https://github.com/grevory/angular-local-storage
  */
  .config(function (localStorageServiceProvider) {
    localStorageServiceProvider
      .setPrefix('histograph')
      .setNotify(true, true);
  })
  .config(function ($uibTooltipProvider) {
    $uibTooltipProvider.options({
      placement: 'top',
      animation: true,
      popupDelay: 0,
      popupCloseDelay: 50,
      appendToBody: true
    })
  })
  .config(function ($stateProvider, $urlRouterProvider, GRAMMAR) {
    $urlRouterProvider
      .otherwise("/");

    /*
      set up states and rules to be used as grammar for the filters controller, cfr js/controllers/filters.js
    */  
    $stateProvider
      .state('index', {
        url: '/in',
       
        templateUrl: 'templates/index.html',
        controller: 'IndexCtrl',
        reloadOnSearch: false,
      })

      .state('geo', {
        url: '/geo',
        templateUrl: 'templates/geo.html',
        controller: 'GeoCtrl',
        reloadOnSearch: false,
        resolve:{
          points: function(VisualizationFactory, $location) {
            return VisualizationFactory.geo($location.search()).then(function(res){
              return res.data.result.items
            });
          }
        }
      })
      
      .state('explore', {
        url: '/',
        abstract: true,
        templateUrl: 'templates/explore.html',
        controller: 'ExploreCtrl',
        grammar: {
          name: 'resource',
          label: 'show',
          choices: [
            {
              name: 'explore.resources',
              label: 'gallery of resources',

            }, 
            {
              name: 'explore.projection',
              label: 'graph of person--person co-occurrences',
              params: {
                modelA: 'person',
                modelB: 'person'
              }
            },
            {
              name: 'explore.projection',
              label: 'graph of location co-occurrences',
              params: {
                modelA: 'location',
                modelB: 'location'
              }
            },
            {
              name: 'explore.projection',
              label: 'graph of theme co-occurrences',
              params: {
                modelA: 'theme',
                modelB: 'theme'
              }
            },
            {
              name: 'explore.projection',
              label: 'graph of theme - location cooccurrences',
              params: {
                modelA: 'theme',
                modelB: 'location'
              }
            },
            {
              name: 'explore.projection',
              label: 'graph of theme - place cooccurrences',
              params: {
                modelA: 'theme',
                modelB: 'place'
              }
            }
          ],
          connector: {
            type: 'in documents of type',
            relatedTo: 'which mentions',
            notRelatedTo: 'related to anyone',
            from: 'from',
            to: 'to'
          },
          types: GRAMMAR.IN_TYPES,
          relatedTo: {
            typeahead: 'entity'
          }
        },
      })
        .state('explore.resources', {
          url: '',
          templateUrl: 'templates/partials/resources-masonry.html',
          controller: 'ExploreResourcesCtrl',
          grammar: {
            label: 'gallery',
            connector: {
              type: 'with document type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.AS_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
        })
        .state('explore.noise', {
          url: 'noise',
          templateUrl: 'templates/partials/resources-masonry.html',
          controller: 'ExploreNoiseCtrl',
          grammar: {
            label: 'gallery',
            connector: {
              type: 'with document type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.AS_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
        })
        .state('explore.projection', {
          url: 'projection/:modelA/:modelB',
          template: '<div></div>',
          controller: 'ProjectionCtrl',
          grammar: {
            label: 'graph of :modelA---:modelB co-occurrences',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            relatedModel: function($stateParams) {
              return $stateParams.modelA
            },
            projectedModel: function($stateParams) {
              return $stateParams.modelB
            },
          }
        })
        
        .state('explore.issues', {
          url: 'issues',
          templateUrl: 'templates/partials/issues-masonry.html',
          controller: 'ExploreIssuesCtrl',
          grammar: {
            label: 'issues',
            connector: {
              type: 'of documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
        })

      
      .state('entity', {
        abstract: true,
        url: '/e/:id',
        templateUrl: 'templates/entity.html',
        controller: 'EntityCtrl',
        reloadOnSearch: false,
        grammar: {
          name: 'resource',
          label: 'explore next',
          choices: [
            {
              name: 'entity.resources',
              label: 'related documents'
            },  {
              name: 'entity.graph',
              label: 'graph of related people'
            },  {
              name: 'entity.graph.themes',
              label: 'graph of related themes'
            }, {
              name: 'entity.persons',
              label: 'related people'
            }
          ],
        },
        resolve: {
          entity: function(EntityFactory, $stateParams) {
            return EntityFactory.get({
              id: $stateParams.id
            }).$promise;
          },
          // cooccurrences (appearing with)
          persons: function(EntityRelatedFactory, $stateParams) {
            return EntityRelatedFactory.get({
              id: $stateParams.id,
              model: 'person',
              limit: 10
            }, {}).$promise;
          },
          // lcoation cooccurrences (appearing with)
          locations: function(EntityRelatedFactory, $stateParams) {
            return EntityRelatedFactory.get({
              id: $stateParams.id,
              model: 'location',
              limit: 10
            }, {}).$promise;
          },
          // resources: function(EntityRelatedFactory, $stateParams) {
          //   return EntityRelatedFactory.get({
          //     id: $stateParams.id,
          //     model: 'resources',
          //     limit: 10
          //   }, {}).$promise;
          // }
        }
      })
        .state('entity.graph', {
          url: '/g',
          template: '<div></div>',
          controller: 'GraphCtrl',
          grammar: {
            label: 'graph of related people',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve:{
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'person'
            },
            relatedVizFactory: function(EntityRelatedVizFactory) {
              return EntityRelatedVizFactory
            }
          }
        })
        .state('entity.graph.theme', {
          url: '/theme',
          template: '<div></div>',
          controller: 'GraphCtrl',
          grammar: {
            label: 'graph of related themes',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve:{
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'theme'
            },
            relatedVizFactory: function(EntityRelatedVizFactory) {
              return EntityRelatedVizFactory
            }
          }
        })
        .state('entity.persons', {
          url: '/per',
          templateUrl: 'templates/partials/entities.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'related people',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function(){
              return 'person'
            },
            relatedVizFactory: function(EntityRelatedVizFactory) {
              return EntityRelatedVizFactory
            },
            relatedFactory: function(EntityRelatedFactory) {
              return EntityRelatedFactory
            },
            relatedItems: function(EntityRelatedFactory, $stateParams, $location) {
              return EntityRelatedFactory.get(angular.extend({}, $location.search(), {
                id: $stateParams.id,
                model: 'person',
                limit: 10,
                offset: 0
              })).$promise;
            }
          }
        })
        .state('entity.organizations', {
          url: '/org',
          templateUrl: 'templates/partials/entities.html',
          controller: 'EntitiesCtrl',
          resolve: {
            model: function(){
              return 'organization'
            },
            relatedVizFactory: function(EntityRelatedVizFactory) {
              return EntityRelatedVizFactory
            },
            relatedFactory: function(EntityRelatedFactory) {
              return EntityRelatedFactory
            },
            entities: function(EntityRelatedFactory, $stateParams) {
              return EntityRelatedFactory.get({
                id: $stateParams.id,
                model: 'organization',
                limit: 10
              }).$promise;
            }
          }
        })
        .state('entity.locations', {
          url: '/loc',
          templateUrl: 'templates/partials/entities.html',
          controller: 'EntitiesCtrl',
          resolve: {
            model: function(){
              return 'location'
            },
            relatedVizFactory: function(EntityRelatedVizFactory) {
              return EntityRelatedVizFactory
            },
            relatedFactory: function(EntityRelatedFactory) {
              return EntityRelatedFactory
            },
            entities: function(EntityRelatedFactory, $stateParams) {
              return EntityRelatedFactory.get({
                id: $stateParams.id,
                model: 'location',
                limit: 10
              }).$promise;
            }
          }
        })
        .state('entity.resources', {
          url: '',
          // templateUrl: 'templates/partials/resources.html',
          templateUrl: 'templates/partials/resources-masonry.html',
          
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'related documents',
            connector: {
              type: 'of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'resource'
            },
            relatedVizFactory: function(EntityRelatedVizFactory) {
              return EntityRelatedVizFactory
            },
            relatedFactory: function(EntityRelatedFactory) {
              return EntityRelatedFactory
            },
            relatedItems: function(EntityRelatedFactory, $stateParams, $location) {
              return EntityRelatedFactory.get(angular.extend({},$location.search(), {
                id: $stateParams.id,
                model: 'resource',
                limit: 10
              })).$promise;
            },
          }
        })
      
      /*
        user
        /u          - the authenticated user profile
        /u/username - the PUBLIC profile of another user
      */
      .state('user', {
        url: '/u/:id',
        abstract: true,
        templateUrl: 'templates/user.html',
        controller: 'UserCtrl',
        grammar: {
          name: 'user',
          label: 'show user',
          choices: [
            {
              name: 'user.resources',
              label: 'favourite documents'
            }
          ],
        },
        resolve: {
          pulse: function(UserFactory, $stateParams) {
            return UserFactory.get({
              method: 'pulse'
            }).$promise;
          }
        }
      })
        .state('user.resources', {
          url: '',
          templateUrl: 'templates/partials/resources.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'favourite documents',
            connector: {
              type: 'of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: [
              {
                name: 'of any type',
              },
              {
                name: 'pictures',
                filter: 'type=picture'
              },
              {
                name: 'letters',
                filter: 'type=letter'
              },
              {
                name: 'treaty',
                filter: 'type=treaty'
              }
            ],
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [
                'syncGraph'
              ]
            },
            relatedModel: function() {
              return 'resource'
            },
            relatedVizFactory: function(UserRelatedVizFactory) {
              return UserRelatedVizFactory
            },
            relatedFactory: function(UserRelatedFactory) {
              return UserRelatedFactory
            },
            relatedItems: function(UserRelatedFactory, $stateParams, $location) {
              return UserRelatedFactory.get(angular.extend({},$location.search(), {
                id: $stateParams.id,
                model: 'resource',
                limit: 10
              })).$promise;
            },
          }
        })

       /*
        resources
        @todo
      */
      .state('resource', {
        url: '/r/:id',
        abstract: true,
        templateUrl: 'templates/resource.html',
        controller: 'ResourceCtrl',
        reloadOnSearch: false,
        resolve: {
          resource: function(ResourceFactory, $stateParams) {
            return ResourceFactory.get({
              id: $stateParams.id
            }).$promise;
          },
          // user annotations, if any
          annotations: function(ResourceRelatedFactory, $stateParams) {
            return ResourceRelatedFactory.get({
              model: 'annotate',
              id: $stateParams.id
            }).$promise;
          }
        },
        grammar: {
          name: 'resource',
          label: 'explore next',
          choices: [
            {
              name: 'resource.resources',
              label: 'documents'
            }, 
            {
              name: 'resource.graph',
              label: 'graph of documents'
            }, 
            {
              name: 'resource.persons',
              label: 'people'
            },
            {
              name: 'resource.users',
              label: 'researchers'
            },
            {
              name: 'resource.inquiries',
              label: 'inquiries'
            },

            {
              name: 'resource.organizations',
              label: 'organizations (experimental)'
            }
          ]
        }
      })
        .state('resource.graph', {
          url: '/g',
          template: '<div></div>',
          controller: 'GraphCtrl',
          grammar: {
            label: 'graph of documents',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.AS_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve:{
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'resource'
            },
            relatedVizFactory: function(ResourceRelatedVizFactory) {
              return ResourceRelatedVizFactory
            }
          }
        })
        .state('resource.resources', {
          url: '',
          //templateUrl: 'templates/partials/resources.html',
          templateUrl: 'templates/partials/resources-masonry.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'Related documents',
            connector: {
              type: 'of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.AS_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'resource'
            },
            relatedVizFactory: function(ResourceRelatedVizFactory) {
              return ResourceRelatedVizFactory
            },
            relatedFactory: function(ResourceRelatedFactory) {
              return ResourceRelatedFactory
            },
            relatedItems: function(ResourceRelatedFactory, $stateParams, $location) {
              
              return ResourceRelatedFactory.get(angular.extend({
                id: $stateParams.id,
                model: 'resource',
                limit: 10
              }, $location.search())).$promise;
            },
          }
        })
        .state('resource.persons', {
          url: '/per',
          templateUrl: 'templates/partials/entities.html',
          controller: 'RelatedItemsCtrl',
          // added custom grammar dict
          // diplay people [in documents of type] ...
          grammar: {
            label: 'people',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.IN_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function(){
              return 'person'
            },
            relatedVizFactory: function(ResourceRelatedVizFactory) {
              return ResourceRelatedVizFactory
            },
            relatedFactory: function(ResourceRelatedFactory) {
              return ResourceRelatedFactory
            },
            relatedItems: function(ResourceRelatedFactory, $stateParams, $location) {
              return ResourceRelatedFactory.get(angular.extend({
                id: $stateParams.id,
                model: 'person',
                limit: 10
              }, $location.search())).$promise;
            }
          }
        })
        .state('resource.organizations', {
          url: '/org',
          templateUrl: 'templates/partials/entities.html',
          controller: 'EntitiesCtrl',
          grammar: {
            label: 'organizations',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: [
              {
                name: 'in any resource type',
              },
              {
                name: 'in pictures',
                filter: 'type=picture'
              },
              {
                name: 'in letters',
                filter: 'type=letter'
              },
              {
                name: 'in treaty',
                filter: 'type=treaty'
              }
            ],
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function(){
              return 'organization'
            },
            relatedVizFactory: function(ResourceRelatedVizFactory) {
              return ResourceRelatedVizFactory
            },
            relatedFactory: function(ResourceRelatedFactory) {
              return ResourceRelatedFactory
            },
            entities: function(ResourceRelatedFactory, $stateParams) {
              return ResourceRelatedFactory.get({
                id: $stateParams.id,
                model: 'organization',
                limit: 10
              }).$promise;
            }
          }
        })
        
        .state('resource.users', {
          url: '/u',
          templateUrl: 'templates/partials/users.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'researchers',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function(){
              return 'user'
            },
            relatedVizFactory: function(ResourceRelatedVizFactory) {
              return ResourceRelatedVizFactory
            },
            relatedFactory: function(ResourceRelatedFactory) {
              return ResourceRelatedFactory
            },
            relatedItems: function(ResourceRelatedFactory, $stateParams, $location) {
              return ResourceRelatedFactory.get(angular.extend({
                id: $stateParams.id,
                model: 'user',
                limit: 10
              }, $location.search())).$promise;
            },
          }
        })

        .state('resource.inquiries', {
          url: '/inq',
          templateUrl: 'templates/partials/inquiries.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'inquiries',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function(){
              return 'inquiry'
            },
            relatedVizFactory: function(ResourceRelatedVizFactory) {
              return ResourceRelatedVizFactory
            },
            relatedFactory: function(ResourceRelatedFactory) {
              return ResourceRelatedFactory
            },
            relatedItems: function(ResourceRelatedFactory, $stateParams, $location) {
              return ResourceRelatedFactory.get(angular.extend({
                id: $stateParams.id,
                model: 'inquiry',
                limit: 10
              }, $location.search())).$promise;
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
        
        .state('resource.createInquiry', {
          url: '/inq/create',
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
        url: '/neighbors/{ids:[0-9,A-Z_a-z-]+}',
        templateUrl: 'templates/neighbors.html',
        controller: 'NeighborsCtrl',
        grammar: {
          name: 'neighbors',
          label: 'explore the network of',
          choices: [
            {
              name: 'neighbors.resources',
              label: 'documents'
            }, {
              name: 'neighbors.persons',
              label: 'people'
            }
          ]
        },
        // resolve: {
        //   allInBetween: function(SuggestFactory, $stateParams) {
        //     return SuggestFactory.allInBetween({
        //       ids: $stateParams.ids
        //     });
        //   }
        // }
      })
        .state('neighbors.resources', {
          url: '',
          templateUrl: 'templates/partials/resources.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'documents',
            connector: {
              type: 'of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'between',
              from: 'from',
              to: 'to'
            },
            types: GRAMMAR.AS_TYPES,
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'resource'
            },
            relatedVizFactory: function(SuggestAllInBetweenVizFactory) {
              return SuggestAllInBetweenVizFactory;
            },
            relatedFactory: function(SuggestAllInBetweenFactory) {
              return SuggestAllInBetweenFactory;
            },
            relatedItems: function(SuggestAllInBetweenFactory, $stateParams, $location) {
              return SuggestAllInBetweenFactory.get(angular.extend({
                limit: 10,
                model: 'resource'
              }, $stateParams, $location.search())).$promise; 
            }
          }
        })
        // .state('neighbors.persons', {
        //   url: '/per',
        //   templateUrl: 'templates/partials/entities.html',
        //   controller: 'EntitiesCtrl',
        //   resolve: {
        //     model: function(){
        //       return 'person'
        //     },
        //     relatedVizFactory: function(SuggestVizFactory) {
        //       return SuggestAllInBetweenVizFactory
        //     },
        //     relatedFactory: function(ResourceRelatedFactory) {
        //       return SuggestAllInBetweenFactory
        //     },
        //     entities: function(SuggestAllInBetweenFactory, $stateParams) {
        //     // clean limit here
        //     // console.log($stateParams)
        //       return SuggestAllInBetweenFactory.get({
        //         ids: $stateParams.ids,
        //         limit: 10,
        //         model: 'person'
        //       }).$promise; 
        //     }
        //   }
        // })
      
      .state('search', {
        abstract:true,
        url: '/search/:query',
        templateUrl: 'templates/search.html',
        controller: 'SearchCtrl',
        grammar: {
          name: 'resource',
          label: '',
          choices: [
            {
              name: 'search.resources',
              label: 'documents'
            }
          ]
        },
        resolve: {
          stats: function(SuggestFactory, $stateParams) {
            return SuggestFactory.getStats({
              query: $stateParams.query
            }).$promise;
          }
        }
      })
        .state('search.resources', {
          url: '',
          templateUrl: 'templates/partials/resources.html',
          controller: 'RelatedItemsCtrl',
          grammar: {
            label: 'documents',
            connector: {
              type: 'of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: [
              {
                name: 'any kind of documents',
              },
              {
                name: 'pictures',
                filter: 'type=picture'
              },
              {
                name: 'letters',
                filter: 'type=letter'
              },
              {
                name: 'treaty',
                filter: 'type=treaty'
              }
            ],
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            specials: function() {
              return [

              ]
            },
            relatedModel: function() {
              return 'resource'
            },
            relatedVizFactory: function(SearchVizFactory) {
              return SearchVizFactory
            },
            relatedFactory: function(SearchFactory) {
              return SearchFactory
            },
            relatedItems: function(SearchFactory, $stateParams, $location) {
              return SearchFactory.get(angular.extend({},$location.search(), {
                model: 'resource',
                query: $stateParams.query,
                limit: 10
              })).$promise;
            }
          }
        })
        .state('search.persons', {
          url: '/per',
          templateUrl: 'templates/partials/entities.html',
          controller: 'EntitiesCtrl',
          grammar: {
            label: 'people',
            connector: {
              type: 'in documents of type',
              relatedTo: 'which mentions',
              notRelatedTo: 'related to anyone',
              from: 'from',
              to: 'to'
            },
            types: [
              {
                name: 'in any kind of documents',
              },
              {
                name: 'in pictures',
                filter: 'type=picture'
              },
              {
                name: 'in letters',
                filter: 'type=letter'
              },
              {
                name: 'in treaties',
                filter: 'type=treaty'
              }
            ],
            relatedTo: {
              typeahead: 'entity'
            }
          },
          resolve: {
            model: function(){
              return 'person'
            },
            relatedVizFactory: function(SearchVizFactory) {
              return SearchVizFactory
            },
            relatedFactory: function(SearchFactory) {
              return SearchFactory
            },
            entities: function(SearchFactory, $stateParams, $location) {
              return SearchFactory.get(angular.extend({},$location.search(), {
                model: 'entity',
                query: $stateParams.query,
                limit: 10
              })).$promise;
            },
          }
        })
        .state('search.locations', {
          url: '/loc',
          templateUrl: 'templates/partials/entities.html',
          controller: 'SearchEntitiesCtrl',
        })
        .state('search.organization', {
          url: '/org',
          templateUrl: 'templates/partials/entities.html',
          controller: 'SearchEntitiesCtrl',
        })
        .state('search.social_group', {
          url: '/soc',
          templateUrl: 'templates/partials/entities.html',
          controller: 'SearchEntitiesCtrl',
        })
     
  })
  .config(function ($httpProvider) {
    $httpProvider.interceptors.push(function ($q, $log, $rootScope, EVENTS) {
      return {
        // response: function(response) {
        //   if(response.data.user)
        //     $rootScope.$broadcast(EVENTS.USE_USER, response.data.user);
        //   return response
        // },
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

  .run(function(Analytics) {
    
  })
