/**
 * @ngdoc function
 * @name histograph.controller:NeighborsCtrl
 * @description
 * # NeighborsCtrl
 */
angular.module('histograph')
  .controller('NeighborsCtrl', function ($scope, $log, $stateParams, socket, allInBetween, ResourceFactory) {
    $log.log('NeighborsCtrl ready', $stateParams.ids, allInBetween);
    $scope.syncQueue($stateParams.ids);
    $scope.setGraph(allInBetween.data.result.graph);
    
    $scope.related = allInBetween.data.info.clusters;
    
    // get entities ids to load
    $scope.relatedEntities = allInBetween.data.result.graph.nodes.filter(function (d) {
      return d.type == 'location' || d.type == 'place' || d.type == 'person';
    });
    // get some resource ids to load
    
    
  })
  //
  .controller('NeighborsResourcesCtrl', function ($scope, $log, $stateParams, allInBetween, ResourceFactory) {
    $log.log('NeighborsResourcesCtrl ready');
    
    
    
    $scope.totalItems = allInBetween.data.info.clusters.resource || 0;
    // get resources to load...
    var playlistIds = $stateParams.ids.split(',').map(function(d) {
      return +d;
    });
    
    var resourcesToLoad = allInBetween.data.result.graph.nodes.filter(function (d) {
      console.log(d, playlistIds.indexOf(d.id))
      return d.type == 'resource' && playlistIds.indexOf(d.id)== -1;
    }).map(function (d) {
      return d.id;
    });
    
    $log.log('NeighborsCtrl load related items ',resourcesToLoad.length , playlistIds);
    
    
    if(resourcesToLoad.length)
      ResourceFactory.get({
        id: resourcesToLoad.join(',')
      }, function(res) {
        $scope.setRelatedItems(res.result.items);
      })
    else
      $scope.setRelatedItems([])
  });
