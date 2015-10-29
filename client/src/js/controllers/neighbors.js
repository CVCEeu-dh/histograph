/**
 * @ngdoc function
 * @name histograph.controller:NeighborsCtrl
 * @description
 * # NeighborsCtrl
 */
angular.module('histograph')
  .controller('NeighborsCtrl', function ($scope, $log, $stateParams, socket) {
    $log.log('NeighborsCtrl ready, ids:', $stateParams.ids);
    // $scope.syncQueue($stateParams.ids);
    
    // $scope.syncGraph = function () {
    //   SuggestVizFactory.allInBetween({
    //     ids:$stateParams.ids,
    //     viz: 'graph',
    //     entity: 'person'
    //   }, function(res) {
    //     $scope.setGraph(res.result.graph);
    //   })
    // }
    // $scope.setGraph(allInBetween.data.result.graph);
    
    // $scope.related = allInBetween.data.info.clusters;
    
    // // get entities ids to load
    // $scope.relatedEntities = allInBetween.data.result.graph.nodes.filter(function (d) {
    //   return d.type == 'location' || d.type == 'place' || d.type == 'person';
    // });
    // // get some resource ids to load
    
    // $scope.syncGraph();
  })
  //
  .controller('NeighborsResourcesCtrl', function ($scope, $log, $stateParams, ResourceFactory) {
    $log.log('NeighborsResourcesCtrl ready');
    
    return;
    
    $scope.totalItems = allInBetween.data.info.clusters.resource || 0;
    // get resources to load...
    var playlistIds = $stateParams.ids.split(',').map(function(d) {
      return +d;
    });
    
    var resourcesToLoad = allInBetween.data.result.graph.nodes.filter(function (d) {
      return d.type == 'resource' && playlistIds.indexOf(d.id)== -1;
    }).map(function (d) {
      return d.id;
    });
    
    $log.log('NeighborsCtrl load related items ',resourcesToLoad.length);
    
    
    if(resourcesToLoad.length)
      ResourceFactory.get({
        id: resourcesToLoad.join(',')
      }, function(res) {
        console.log(resourcesToLoad.join(','))
        $scope.setRelatedItems(res.result.items || [res.result.item]);
      })
    else
      $scope.setRelatedItems([])
  });
