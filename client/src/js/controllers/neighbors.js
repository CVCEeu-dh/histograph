/**
 * @ngdoc function
 * @name histograph.controller:NeighborsCtrl
 * @description
 * # NeighborsCtrl
 */
angular.module('histograph')
  .controller('NeighborsCtrl', function ($scope, $log, $routeParams, socket, neighbors, ResourceFactory) {
    $log.debug('NeighborsCtrl ready', $routeParams.ids, neighbors);
    
    $scope.neighbors = neighbors.data.result.items;
    
    $scope.syncQueue($routeParams.ids);
    
    
    
    var graph = {
        nodes: [],
        edges: []
        }, 
        index = {
          nodes: {},
          edges: {}
        };
    
    neighbors.data.result.items.forEach(function (d) {
      var edgeId = d.source.id + '.' + d.target.id,
          known; // if the node belongs to the playlist node
      
      if(!index.nodes[d.source.id]) {
        known = neighbors.data.info.ids.indexOf(d.source.id) !== -1;
        index.nodes[d.source.id] = {
          id: '' + d.source.id,
          label: d.source.name,
          x: Math.random()*50,
          y: Math.random()*50,
          type: d.source.type + (known? 'Known': '')
        }
        graph.nodes.push(index.nodes[d.source.id]);
      }
      
      if(!index.nodes[d.target.id]) {
        known = neighbors.data.info.ids.indexOf(d.target.id) !== -1;
        index.nodes[d.target.id] = {
          id: '' + d.target.id,
          label: d.target.name,
          x: Math.random()*50,
          y: Math.random()*50,
          type: d.target.type + (known? 'Known': '')
        }
        graph.nodes.push(index.nodes[d.target.id]);
      }
      
      if(!index.edges[edgeId]) {
        index.edges[edgeId] = {
          id: edgeId,
          source: ''+d.source.id,
          target: ''+d.target.id,
          color: "#a3a3a3"
        };
        graph.edges.push(index.edges[edgeId])
      }
    });
    // console.log(graph)
    $scope.setGraph(graph);
    
    // get ids to call
    var resourcesToLoad = graph.nodes.filter(function (d) {
      return d.type == 'resource';
    }).map(function (d) {
      return d.id;
    });
    $log.log('NeighborsCtrl load related items ',resourcesToLoad );
    if(resourcesToLoad.length)
      ResourceFactory.get({
        id: resourcesToLoad.join(',')
      }, function(res) {
        
        $scope.setRelatedItems(res.result.items);
      })
    else
      $scope.setRelatedItems([])
    
    
  });