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
    
    
    // get entities ids to load
    $scope.relatedEntities = allInBetween.data.result.graph.nodes.filter(function (d) {
      return d.type == 'location' || d.type == 'place' || d.type == 'person';
    });
    // get some resource ids to load
    var resourcesToLoad = allInBetween.data.result.graph.nodes.filter(function (d) {
      return d.type == 'resource';
    }).map(function (d) {
      return d.id;
    });
    
    $log.log('NeighborsCtrl load related items ',resourcesToLoad.length );
    
    
    if(resourcesToLoad.length)
      ResourceFactory.get({
        id: resourcesToLoad.join(',')
      }, function(res) {
        $scope.setRelatedItems(res.result.items);
      })
    else
      $scope.setRelatedItems([])
    
  })
