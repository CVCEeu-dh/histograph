/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $stateParams, socket, resources, entities, SuggestFactory, EVENTS) {
    $log.debug('SearchCtrl ready, query "', $stateParams.query, '" matches', resources.data.info.total_count, 'documents', entities.data.info.total_count, 'entities');
    
    $scope.pagetitle = 'documents found';
    
    $scope.matchingResources = {
      items: resources.data.result.items,
      totalItems: resources.data.info.total_count,
      limit:  resources.data.info.limit
    }
     
    $scope.matchingEntities  = {
      items: entities.data.result.items,
      totalItems: entities.data.info.total_count,
      limit:  entities.data.info.limit
    };
    
    $scope.matchingQuery = $stateParams.query;
    
    
    /*
      Graph
    */
    $scope.setHeader('graph', 'network of search results for "'+ $stateParams.query+'"');
    
    SuggestFactory.getGraph({
      query: $stateParams.query,
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
    
    /*
      sync
      reload items according to page, prefix and active filters
    */
    $scope.sync = function(params){
      if(typeof params.prefix == undefined || params.prefix == 'resources'){
        $scope.matchingResources.loading = true;
        SuggestFactory.getResources({
          query: $stateParams.query,
          limit: 10,
          offset: (params.page-1)*10
        }).then(function (res) {
          $scope.matchingResources = {
            items:      res.data.result.items,
            totalItems: res.data.info.total_count,
            limit:      res.data.info.limit,
            page:       params.page,
            loading:    false
          }
        });
      }
      if(typeof params.prefix == undefined || params.prefix == 'entities'){
        $scope.matchingEntities.loading = true;
        SuggestFactory.getEntities({
          query: $stateParams.query,
          limit: 10,
          offset: (params.page-1)*10
        }).then(function (res) {
          $scope.matchingEntities = {
            items:      res.data.result.items,
            totalItems: res.data.info.total_count,
            limit:      res.data.info.limit,
            page:       params.page,
            loading:    false
          }
        });
      }
    };
    /*
      event listeners
    */
    $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
      $log.debug('SearchCtrl @PAGE_CHANGED', params);
      $scope.page = params.page;
      $scope.sync(params);
    });
  });
    
    