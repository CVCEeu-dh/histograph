/**
 * @ngdoc function
 * @name histograph.controller:NeighborsCtrl
 * @description
 * # NeighborsCtrl
 */
angular.module('histograph')
  .controller('NeighborsCtrl', function ($scope, $log, $stateParams, socket, SuggestFactory, EVENTS) {
    $log.debug('NeighborsCtrl ready, ids:', $stateParams.ids);
    // $scope.syncQueue($stateParams.ids);
    
    // /*
    //   Load/sync graph
    //   ---

    //   load the timeline of entity related resources
    // */
    // $scope.syncGraph = function() {
    //   SuggestFactory.allInBetween(angular.extend({
    //     ids:$stateParams.ids,
    //     viz: 'graph',
    //     model: 'resource',
    //     entity: 'person'
    //   }, $scope.params), function(res) {
    //     $scope.setGraph(res.result.graph);
    //   })
    // };

    /*
      LoadTimeline
      ---

      load the timeline of entity related resources
    */
    $scope.syncTimeline = function() {
      $log.log('NeighborsCtrl -> syncTimeline()');
      SuggestFactory.allInBetween(angular.extend({
        ids:$stateParams.ids,
        viz: 'timeline',
        model: 'resource',
        entity: 'person'
      }, $scope.params), function(res) {
         $scope.setTimeline(res.result.timeline)
      });
    };

    // $scope.setGraph(allInBetween.data.result.graph);
    
    // $scope.related = allInBetween.data.info.clusters;
    
    // // get entities ids to load
    // $scope.relatedEntities = allInBetween.data.result.graph.nodes.filter(function (d) {
    //   return d.type == 'location' || d.type == 'place' || d.type == 'person';
    // });
    // // get some resource ids to load
    
    // $scope.syncGraph();

    /*
      listener: EVENTS.API_PARAMS_CHANGED
      some query parameter has changed, reload the list accordingly.
    */
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $scope.offset = 0;
      $log.debug('NeighborsCtrl @API_PARAMS_CHANGED', $scope.params);
      // $scope.syncGraph();
      $scope.syncTimeline();
    });

    $scope.syncTimeline();
  });
