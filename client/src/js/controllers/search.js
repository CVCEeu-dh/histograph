/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $routeParams, socket, resources) {
    $log.debug('SearchCtrl ready', $routeParams.query, resources);
    
    $scope.related = resources.data.result.items;
    
    $scope.setGraph({nodes:[],edges:[]})
  });
    
    