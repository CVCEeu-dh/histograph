/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('CollectionCtrl', function ($scope, $log, $routeParams, socket, collection) {
    $log.debug('CollectionCtrl ready', $routeParams.id, collection.result.item);
    $scope.collection = collection.result.item;
  
  });