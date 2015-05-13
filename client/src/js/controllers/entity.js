/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('EntityCtrl', function ($scope, $log, $routeParams, socket, entity) {
    $log.debug('EntityCtrl ready', $routeParams.id, entity.result.item);
    
    $scope.item = entity.result.item;
    //$scope.related    = resources.result.items;
    
    // sync graph  and find relative
    // EntityVizFactory.get({
    //   id: $routeParams.id,
    //   viz: 'graph'
    // }, {}, function(res) {
    //   res.result.graph.nodes.map(function (d) {
    //     d.color  = d.color || "#6891A2";
    //     d.type = d.type || 'res';
    //     d.x = Math.random()*50;
    //     d.y = Math.random()*50;
    //     d.label = d.name;
    //     return d;
    //   })
      
            
    //   $scope.setGraph(res.result.graph)
    // });
  });