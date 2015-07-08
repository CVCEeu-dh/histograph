/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $routeParams, socket, resources, SuggestFactory) {
    $log.debug('SearchCtrl ready, query "', $routeParams.query, '" matches', resources.data.info.total_count, 'documents');
    
    $scope.pagetitle = 'documents found';
    $scope.totalItems = resources.data.info.total_count;
    $scope.setRelatedItems(resources.data.result.items);
    
    $scope.setRelatedPagination({
      total_count: resources.data.info.total_count,
      limit: resources.data.info.limit,
      offset: resources.data.info.offset
    });
    $scope.setHeader('graph', 'network of search results for "'+ $routeParams.query+'"');
    
    SuggestFactory.getGraph({
        query: $routeParams.query,
        limit: 2000
      }).then(function(res) {
        $log.log('res', res)
        res.data.result.graph.nodes.map(function (d) {
          d.color  = d.type == 'person'? "#D44A33": "#6891A2";
          d.type   = d.type || 'res';
          d.x = Math.random()*50;
          d.y = Math.random()*50;
          //d.label = d.name;
          return d;
        })
        $log.debug('SearchCtrl set graph', res.data.result.graph.nodes.length);
        
        // once done, load the other viz
        $scope.setGraph(res.data.result.graph)
      });
    
  });
    
    