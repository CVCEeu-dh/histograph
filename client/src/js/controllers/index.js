/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('IndexCtrl', function ($scope, $log, $timeout, ResourcesFactory) {
    $log.debug('IndexCtrl ready');
    ResourcesFactory.get(function (res) {
      $log.info('ResourceFactory', res.result.items.length, res.result.items[0]);
      $scope.items = res.result.items;
    });
  })