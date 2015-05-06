/**
 * @ngdoc service
 * @name histograph.services
 * @description
 * # core
 * Resource REST API service Factory.
 */
angular.module('histograph')
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
    GET related resources
  */
  .factory('ResourceRelatedFactory', function ($resource) {
    return $resource('/api/resource/:id/related', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    Add a comment to a resource
  */
  .factory('ResourceCommentsFactory', function ($resource) {
    return $resource('/api/resource/:id/comments', {}, {
        query: {method: 'GET' },
    });
  })
  /*
    Get/Update/Delete one collection
  */
  .factory('CollectionFactory', function ($resource) {
    return $resource('/api/collection/:id', {}, {});
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
  .factory('SuggestFactory', function ($resource) {
    return $resource('/api/suggest');
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