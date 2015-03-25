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