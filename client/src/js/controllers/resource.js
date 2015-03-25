/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $routeParams, ResourceFactory, socket) {
    $log.debug('ResourceCtrl ready', $routeParams.id);
    ResourceFactory.get({id:$routeParams.id}, function (res) {
      $log.info('ResourceFactory', res.result);
      $scope.item = res.result.item;
    });


    /**
      Socket
    */
    socket.on('start:mention', function (result) {
      $log.info('start:mention', result.data.id, $routeParams.id);
    });
  })