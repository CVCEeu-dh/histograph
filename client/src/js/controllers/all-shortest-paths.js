/**
 * @ngdoc function
 * @name histograph.controller:AllShortestPathsCtrl
 * @description
 * # AllShortestPathsCtrl
 */
angular.module('histograph')
  .controller('AllShortestPathsCtrl', function ($scope, $log, $routeParams, socket, allShortestPaths, ResourceFactory) {
    $log.log('AllShortestPathsCtrl ready', $routeParams.ids, allShortestPaths);
    
    $scope.AllShortestPaths = allShortestPaths.data.result.items;
    
    $scope.syncQueue($routeParams.ids);
    
    
    
    var graph = {
          nodes: [],
          edges: []
        }, 
        index = {
          nodes: {},
          edges: {}
        };
    
    allShortestPaths.data.result.items.forEach(function (d) {
      for(var i = 0; i < d.path.length; i++) {
        if(!index.nodes[d.path[i].id]) {
          // is one of the KNOWN ones?
          var known = allShortestPaths.data.info.ids.indexOf(d.path[i].id) !== -1;
          index.nodes[d.path[i].id] = {
            id: '' + d.path[i].id,
            label: d.path[i].name,
            x: Math.random()*50,
            y: Math.random()*50,
            type: d.path[i].type + (known? 'Known': '')
          }
          graph.nodes.push( index.nodes[d.path[i].id])
        }
        // edges
        if(i == d.path.length-1)
          break;
        
        var edgeId = d.path[i].id + '.' + d.path[i + 1].id;
        
        if(!index.edges[edgeId]) {
          index.edges[edgeId] = {
            id: edgeId,
            source: ''+d.path[i].id,
            target: ''+d.path[i + 1].id,
            color: "#a3a3a3"
          };
          graph.edges.push(index.edges[edgeId])
        }
        
      }
    })
    
    // get ids to call
    var resourcesToLoad = graph.nodes.filter(function (d) {
      return d.type == 'resource';
    }).map(function (d) {
      return d.id;
    });
    $log.log('AllShortestPathsCtrl load related items ',resourcesToLoad );
    if(resourcesToLoad.length)
      ResourceFactory.get({
        id: resourcesToLoad.join(',')
      }, function(res) {
        
        $scope.setRelatedItems(res.result.items);
      })
    else
      $scope.setRelatedItems([])
    
    console.log(graph)
    $scope.setGraph(graph)
  });