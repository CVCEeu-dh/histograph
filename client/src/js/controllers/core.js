/**
 * @ngdoc function
 * @name histograph.controller:CoreCtrl
 * @description
 * # CoreCtrl
 * Main controller, handle socket/io bridging for notification
 * It is the parent of the other controllers.
 */
angular.module('histograph')
  .controller('CoreCtrl', function ($scope, $log, $timeout, socket) {
    $log.debug('CoreCtrl ready');
    
    // the current user
    $scope.user = {};

    $scope.setUser = function (user, update) {
      if(update || !$scope.user.id)
        $scope.user = user;
    };

    /*
      Will automatically update the graph view
      according tho the nodes edges propsed here.
    */
    $scope.setGraph = function(graph) {
      $scope.graph = graph;
    };
  })