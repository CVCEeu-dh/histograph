/**
 * @ngdoc service
 * @name histograph.services
 * @description
 * # core
 * Resource REST API service Factory.
 */
angular.module('histograph')
  /*
    Check & clean service
  */
  .factory('cleanService', function() {
    return {
      params: function(params) {
        return params;
      }
    };
  })
  /*
    Get a list of resource
  */
  .factory('ResourcesFactory', function ($resource) {
    return $resource('/api/resource', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    Get/Update/Delete one resource
  */
  .factory('ResourceFactory', function ($resource) {
    return $resource('/api/resource/:id', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    DEPRECATED
  */
  .factory('ResourceVizFactory', function ($resource) {
    return $resource('/api/resource/:id/:viz', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    Should contain all viz methods available (GET only vis)
    DEPRECATED
  */
  .factory('VisualizationFactory', function ($http) {
    return {
      resource: function(viz, options) {
        return $http.get('/api/resource/' +viz, {
          params: options
        });
      }
    };
  })
  /*
    Add a comment to a resource
    DEPRECATED
  */
  .factory('ResourceCommentsFactory', function ($resource) {
    return $resource('/api/resource/:id/related/comment', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    Add / get :model related to resource
  */
  .factory('ResourceRelatedFactory', function ($resource) {
    return $resource('/api/resource/:id/related/:model');
  })
  /*
    Add / get :model related to resource
  */
  .factory('ResourceRelatedVizFactory', function ($resource) {
    return $resource('/api/resource/:id/related/:model/:viz');
  })
  /*
    POST Save a new inquiry (modify it) or GET list of inquiries
  */
  .factory('InquiryFactory', function ($resource) {
    return $resource('/api/inquiry/:id');
  })
  /*
    Add / get :model related to inquiries
  */
  .factory('InquiryRelatedFactory', function ($resource) {
    return $resource('/api/inquiry/:id/related/:model');
  })
  /*
    Get/Update/Delete one collection
  */
  .factory('CollectionFactory', function ($resource) {
    return $resource('/api/collection/:id', {}, {});
  })
  .factory('CollectionRelatedFactory', function ($resource) {
    return $resource('/api/collection/:id/related/:model', {}, {});
  })
  .factory('CollectionVizFactory', function ($resource) {
    return $resource('/api/collection/:id/:viz', {
      id: '@id',
      viz: '@viz'
    });
  })
  /*
    Get/Update/Delete one entity
  */
  .factory('EntityFactory', function ($resource) {
    return $resource('/api/entity/:id', {}, {});
  })
  .factory('EntityRelatedFactory', function ($resource) {
    return $resource('/api/entity/:id/related/:model');
  })
  .factory('EntityExtraFactory', function ($resource) {
    return $resource('/api/entity/:id/:extra', {}, {});
  })
  /*
    model - the related model
    type  - type of viz, eg graph or timeline
  */
  .factory('EntityRelatedVizFactory', function ($resource) {
    return $resource('/api/entity/:id/related/:model/:viz');
  })
  /*
    GET cooccurrences
  */
  .factory('CooccurrencesFactory', function ($resource) {
    return $resource('/api/cooccurrences', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    vote up vote down delete one comment
  */
  .factory('CommentFactory', function ($http) {
    return {
      upvote: function(options) {
        return $http.post('/api/comment/' + options.id + '/upvote');
      },
      downvote: function(options) {
        return $http.post('/api/comment/' + options.id + '/downvote');
      },
    };
  })
  /*
    Get a list of resource
  */
  .factory('UserFactory', function ($resource) {
    return $resource('/api/user/:method');
  })
  /*
    Add / get :model related to user related
  */
  .factory('UserRelatedFactory', function ($resource) {
    return $resource('/api/user/:id/related/:model');
  })
  /*
    Add / get :model related to resource
  */
  .factory('UserRelatedVizFactory', function ($resource) {
    return $resource('/api/user/:id/related/:model/:viz');
  })
  /*
    Search & Suggest
  */
  .factory('SuggestFactory', function ($resource) {
    return $resource('/api/suggest/:m/:ids/:model', {}, {
      getVIAF: {
        method: 'GET',
        params: {
          m: 'viaf',
          model:''
        }
      },
      getUnknownNodes: {
        method: 'GET',
        params: {
          m: 'unknown-nodes',
          model: ''
        }
      },
      getStats: {
        method: 'GET',
        params: {
          m: 'stats',
          model: ''
        }
      },
      getEntities: {
        method: 'GET',
        params: {
          m: 'entity',
          model: ''
        }
      },
      getResources: {
        method: 'GET',
        params: {
          m: 'resource',
          model: ''
        }
      },
      getUnknownNode: {
        method: 'GET',
        params: {
          m: 'unknown-node',
          model: ''
        }
      },
      allInBetween:{
        method: 'GET',
        params: {
          m: 'all-in-between',
          model: ''
        }
      },
      getShared:{
        method: 'GET',
        params: {
          m: 'shared',
          model: 'resource' // default
        }
      }
    });
  })
  
  .factory('SuggestAllInBetweenFactory', function ($resource) {
    return $resource('/api/suggest/all-in-between/:ids/:model');
  })
  
  .factory('SuggestAllInBetweenVizFactory', function ($resource) {
    return $resource('/api/suggest/all-in-between/:ids/:model/:viz');
  })
  
  .factory('SearchFactory', function ($resource) {
    return $resource('/api/suggest/:model');
  })
  
  .factory('SearchVizFactory', function ($resource) {
    return $resource('/api/suggest/:model/:viz');
  })
  
  
  
  // .factory('SuggestFactory', function ($http) {
  //   return {
  //     get: function(options) {
  //       return $http.get('/api/suggest', {
  //         params: options
  //       });
  //     },
  //     allShortestPaths: function(options) {
  //       return $http.get('/api/suggest/all-shortest-paths/' + options.ids);
  //     },
  //     allInBetween: function(options) {
  //       return $http.get('/api/suggest/all-in-between/' + options.ids);
  //     },
  //     getUnknownNode: function(options) {
  //       return $http.get('/api/suggest/unknown-node/' + options.id);
  //     },
  //     getUnknownNodes: function(options) {
  //       return $http.get('/api/suggest/unknown-nodes/' + options.ids);
  //     },
  //     neighbors: function(options) {
  //       return $http.get('/api/suggest/neighbors/' + options.ids);
  //     },
  //     getResources: function(options) {
  //       return $http.get('/api/suggest/resources', {
  //         params: options
  //       });
  //     },
  //     getEntities: function(options) {
  //       return $http.get('/api/suggest/entities', {
  //         params: options
  //       });
  //     },
  //     getGraph: function(options) {
  //       return $http.get('/api/suggest/graph', {
  //         params: options
  //       });
  //     } 
  //   };
  // })
  /*
    Socket.io service, thqnks to http://briantford.com/blog/angular-socket-io
  */
  .factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {  
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      }
    };
  });