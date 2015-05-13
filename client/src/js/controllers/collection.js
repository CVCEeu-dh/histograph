/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('CollectionCtrl', function ($scope, $log, $routeParams, socket, collection, resources, CollectionVizFactory) {
    $log.debug('CollectionCtrl ready', $routeParams.id, collection.result.item, resources.length);
    
    $scope.collection = collection.result.item;
    $scope.related    = resources.result.items;
    
    // sync graph  and find relative
    CollectionVizFactory.get({
      id: $routeParams.id,
      viz: 'graph'
    }, {}, function(res) {
      res.result.graph.nodes.map(function (d) {
        d.color  = d.color || "#6891A2";
        d.type = d.type || 'res';
        d.x = Math.random()*50;
        d.y = Math.random()*50;
        d.label = d.name;
        return d;
      })
      
            
      $scope.setGraph(res.result.graph)
    });
  });