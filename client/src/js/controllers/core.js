/**
 * @ngdoc function
 * @name histograph.controller:CoreCtrl
 * @description
 * # CoreCtrl
 * Main controller, handle socket/io bridging for notification
 * It is the parent of the other controllers.
 */
angular.module('histograph')
  .controller('CoreCtrl', function ($scope, $log, $timeout, $http, socket) {
    $log.debug('CoreCtrl ready');
    
    var suggestionTimeout = 0;
    // the current user
    $scope.user = {};

    $scope.setUser = function (user, update) {
      if(update || !$scope.user.id)
        $scope.user = user;
    };

    /*
      Will automatically update the graph view
      according tho the nodes edges propsed here.
      @param graph    - a collection of nodes and edges given as lists
      
    */
    $scope.setGraph = function(graph) {
      $scope.graph = graph;
    };
    
    $scope.suggest = function(query) {
      $log.info('CoreCtrl -> suggest', query);
      return $http.get('/api/suggest', {
        params: {
          query: query
        }
      }).then(function(response){
        return response.data.result.items
      });
    };
  })