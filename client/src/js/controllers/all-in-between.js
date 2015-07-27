/**
 * @ngdoc function
 * @name histograph.controller:AllShortestPathsCtrl
 * @description
 * # AllShortestPathsCtrl
 */
angular.module('histograph')
  .controller('AllInBetweenCtrl', function ($scope, $log, $routeParams, socket, allInBetween, ResourceFactory) {
    $log.log('AllInBetweenCtrl ready', $routeParams.ids, allInBetween);
    $scope.syncQueue($routeParams.ids);
    $scope.setGraph(allInBetween.data.result.graph)
  })