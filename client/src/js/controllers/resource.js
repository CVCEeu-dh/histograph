/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $routeParams, ResourceFactory) {
    $log.debug('ResourceCtrl ready', $routeParams.id);
    ResourceFactory.get({id:$routeParams.id}, function (res) {
      $log.info('ResourceFactory', res.result);
      $scope.item = res.result.item;
    });
  })