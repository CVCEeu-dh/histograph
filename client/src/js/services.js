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
  .factory('ResourceVizFactory', function ($resource) {
    return $resource('/api/resource/:id/:viz', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    Should contain all viz methods available (GET only vis)
  */
  .factory('VisualizationFactory', function ($http) {
    return {
      resource: function(viz, options) {
        return $http.get('/api/resource/' +viz, {
          params: options
        });
      }
    }
  })
  /*
    Add a comment to a resource
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
    return $resource('/api/entity/:id/related/:model', {}, {});
  })
  .factory('EntityVizFactory', function ($resource) {
    return $resource('/api/entity/:id/:viz', {}, {});
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
    Get/Update/Delete one resource
  */
  .factory('SuggestFactory', function ($http) {
    return {
      get: function(options) {
        return $http.get('/api/suggest', {
          params: options
        });
      },
      allShortestPaths: function(options) {
        return $http.get('/api/suggest/all-shortest-paths/' + options.ids);
      },
      getUnknownNode: function(options) {
        return $http.get('/api/suggest/unknown-node/' + options.id);
      },
      getUnknownNodes: function(options) {
        return $http.get('/api/suggest/unknown-nodes/' + options.ids);
      },
      neighbors: function(options) {
        return $http.get('/api/suggest/neighbors/' + options.ids);
      },
      getResources: function(options) {
        return $http.get('/api/suggest/resources', {
          params: options
        });
      },
      getGraph: function(options) {
        return $http.get('/api/suggest/graph', {
          params: options
        });
      } 
    }
  })
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
        })
      }
    };
  });