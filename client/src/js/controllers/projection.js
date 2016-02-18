/**
 * @ngdoc function
 * @name histograph.controller:ProjectionCtrl
 * @description
 * # ProjectionCtrl
 * Handle cooccurrence visualization
 * 
 */
angular.module('histograph')
  .controller('ProjectionCtrl', function ($scope, $log, CooccurrencesFactory, ResourceVizFactory, relatedModel, projectedModel, EVENTS) {
    $log.debug('ProjectionCtrl ready', $scope.params);
    $scope.limit  = 20;
    $scope.offset = 0;
    /*
      Reload related items, with filters.
    */
    $scope.syncGraph = function() {
      $scope.lock('graph');
      CooccurrencesFactory.get(angular.extend({}, $scope.params, {
          model: relatedModel,
          projected_model: projectedModel,
          limit: 300
        }), function (res){
        $scope.unlock('graph');
        $log.log('ProjectionCtrl CooccurrencesFactory returned a graph of',res.result.graph.nodes.length, 'nodes');
        if($scope.filters.with)
          $scope.setGraph(res.result.graph, {
            centers: _.map($scope.filters.with, _.parseInt)
          })
        else
          $scope.setGraph(res.result.graph)
      });
    };
    
     /*
      LoadTimeline
      ---

      load the timeline of filtered resources
    */
    $scope.syncTimeline = function() {
      if(!_.isEmpty($scope.params))
        ResourceVizFactory.get(angular.extend({
          viz: 'timeline'
        }, $scope.params), function (res) {
          // if(res.result.titmeline)
          $scope.setTimeline(res.result.timeline)
        });
      else
        $scope.setTimeline([]);
    };
    /*
      listener: EVENTS.API_PARAMS_CHANGED
      some query parameter has changed, reload the list accordingly.
    */
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $scope.offset = 0;
      $log.debug('ProjectionCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.syncGraph();
      $scope.syncTimeline();
    });
    
    $scope.syncGraph();

    if(!_.isEmpty($scope.params))
      $scope.syncTimeline();
  });