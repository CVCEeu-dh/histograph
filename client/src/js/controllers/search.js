/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $routeParams, socket, matches) {
    $log.debug('SearchCtrl ready', $routeParams.query, matches);
    
    $scope.related = matches.data.result.items;
  });
    
    