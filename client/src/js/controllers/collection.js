/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('CollectionCtrl', function ($scope, $log, $routeParams, ResourceFactory, ResourceCommentsFactory, ResourceRelatedFactory, socket) {
    $log.debug('CollectionCtrl ready', $routeParams.id);
  });