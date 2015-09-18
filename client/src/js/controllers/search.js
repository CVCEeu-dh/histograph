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
      totalItems: resources.data.info.total_count,
    }

    $scope.matchingEntities  = {
      types: _.indexBy(entities.data.info.total_items, 'type'),
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
    
    // /*
    //   sync
    //   reload items according to page, prefix and active filters
    // */
    // $scope.sync = function(params){
    //   if(typeof params.prefix == undefined || params.prefix == 'resources'){
    //     $scope.matchingResources.loading = true;
    //     SuggestFactory.getResources({
    //       query: $stateParams.query,
    //       limit: 10,
    //       offset: (params.page-1)*10
    //     }).then(function (res) {
    //       $scope.matchingResources = {
    //         items:      res.data.result.items,
    //         totalItems: res.data.info.total_count,
    //         limit:      res.data.info.limit,
    //         page:       params.page,
    //         loading:    false
    //       }
    //     });
    //   }
    //   if(typeof params.prefix == undefined || params.prefix == 'entities'){
    //     $scope.matchingEntities.loading = true;
    //     SuggestFactory.getEntities({
    //       query: $stateParams.query,
    //       limit: 10,
    //       offset: (params.page-1)*10
    //     }).then(function (res) {
    //       $scope.matchingEntities = {
    //         items:      res.data.result.items,
    //         totalItems: res.data.info.total_count,
    //         limit:      res.data.info.limit,
    //         page:       params.page,
    //         loading:    false
    //       }
    //     });
    //   }
    // };
    /*
      event listeners
    */
    
  })
  .controller('SearchResourcesCtrl', function ($scope, $log, $stateParams, resources, SuggestFactory, EVENTS) {
    $log.debug('SearchResourcesCtrl ready - query:', $stateParams.query)
    
    $scope.setRelatedItems(resources.data.result.items);
    $scope.totalItems = resources.data.info.total_count;
    $scope.limit = 10;
    $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
      $log.debug('SearchResourcesCtrl @PAGE_CHANGED', params);
      $scope.page = params.page;
      $scope.sync(params);
    });
    
    $scope.sync = function(params){
      SuggestFactory.getResources({
        query: $stateParams.query,
        limit: $scope.limit,
        offset: (params.page-1)*$scope.limit
      }).then(function (res) {
        $scope.setRelatedItems(res.data.result.items);
        $scope.totalItems = res.data.info.total_count;
        $scope.limit = res.data.info.limit;
      });
    };
  })
  .controller('SearchEntitiesCtrl', function ($scope, $log, $stateParams, entities, SuggestFactory, EVENTS) {
    $log.debug('SearchEntitiesCtrl ready - query:', $stateParams.query)
    
    $scope.setRelatedItems(entities.data.result.items);
    $scope.totalItems = 80;
    $scope.limit = 10;
    $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
      $log.debug('SearchEntitiesCtrl @PAGE_CHANGED', params);
      $scope.page = params.page;
      $scope.sync(params);
    });
    
    $scope.sync = function(params){
      SuggestFactory.getEntities({
        query: $stateParams.query,
        limit: $scope.limit,
        entity: $stateParams.entity,
        offset: (params.page-1)*$scope.limit
      }).then(function (res) {
        $scope.setRelatedItems(res.data.result.items);
        $scope.totalItems = res.data.info.total_count;
        $scope.limit = res.data.info.limit;
      });
    };
  })
    
    