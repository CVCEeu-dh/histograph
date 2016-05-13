/**
 * @ngdoc function
 * @name histograph.controller:GeoCtrl
 * @description
 * # GeoCtrl
 * Handle mapbox map with histograph data
 * 
 */
angular.module('histograph')
  .controller('GeoCtrl', function ($scope, $log, points, EVENTS) {
    $log.log('GeoCtrl -> ready', $scope.filters, points);

    
  })