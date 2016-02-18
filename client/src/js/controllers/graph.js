/**
 * @ngdoc function
 * @name histograph.controller:GraphCtrl
 * @description
 * # GraphCtrl
 * Handle crowdsourcing notification and points
 * 
 */
angular.module('histograph')
  .controller('GraphCtrl', function ($scope, $log, $stateParams, relatedModel, relatedVizFactory, EVENTS) {
    // sort of preload
    if($scope.item)
      $scope.triggerGraphEvent(EVENTS.SIGMA_SET_ITEM, $scope.item)
    /*
      Load graph data
    */
    $scope.syncGraph = function() {
      $scope.lock('graph');
      // send a message
      relatedVizFactory.get(angular.extend({
        model: relatedModel,
        viz: 'graph',
        limit: 100,
      },  $stateParams, $scope.params), function (res) {
        $scope.unlock('graph');
        if($stateParams.ids) {
          $scope.setGraph(res.result.graph, {
            centers: $stateParams.ids
          });
        } else if($scope.item && $scope.item.id)
          $scope.setGraph(res.result.graph, {
            centers: [$scope.item.id]
          });
        else
          $scope.setGraph(res.result.graph);
      });
    }

    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $log.debug('ResourcesCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.syncGraph();
    });

    $scope.syncGraph();
    $log.log('GraphCtrl -> ready');
  })