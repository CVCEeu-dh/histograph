/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('EntityCtrl', function ($scope, $log, $stateParams, socket, $filter, entity, persons, EntityExtraFactory,EntityRelatedFactory, EVENTS) {
    $log.debug('EntityCtrl ready', +$stateParams.id);
    
    $scope.item = entity.result.item;
    
    $scope.relatedPersons    = persons.result.items;
    
    
     /*
      Set graph title
    */
    $scope.setHeader('graph', 'cooccurring entities for '+ $filter('title')(entity.result.item.props, $scope.language, 24) + '"');
    
    
    // cooccurrences
    $scope.graphType = 'monopartite-entity'
    // sync graph
    // $scope.drawGraph = function() {
    //   EntityExtraFactory.get({
    //     id: $stateParams.id,
    //     extra: 'graph',
    //     type: $scope.graphType,
    //     limit: 2000
    //   }, function(res) {
    //     $log.log('res', res)
    //     res.result.graph.nodes.map(function (d) {
    //       d.color  = d.type == 'person'? "#D44A33": "#6891A2";
    //       d.type   = d.type || 'res';
    //       d.x = Math.random()*50;
    //       d.y = Math.random()*50;
    //       //d.label = d.name;
    //       return d;
    //     })
    //     $log.debug('EntityCtrl set graph',res.result.graph.nodes);
        
    //     // once done, load the other viz
    //     $scope.setGraph(res.result.graph)
    //   });
    // };
    
    // $scope.$watch('graphType', $scope.drawGraph)
    
    $scope.downvote = function() {
      // downvote current entity
      $log.debug('EntityCtrl -> downvote()', $stateParams.id);
      EntityExtraFactory.save({
        id: $stateParams.id,
        extra: 'downvote',
      }, {}, function (res) {
        $log.debug('EntityCtrl -> downvoted', res);
        $scope.setMessage('thank you for signaling the mistake');
        $scope.item = res.result.item;
      })
    };
    
    
  })
  .controller('EntitiesCtrl', function ($scope, $log, $stateParams, entities, model, relatedFactory, relatedVizFactory, EVENTS){
    $log.log('EntitiesCtrl ready - model:', model);
    
    $scope.totalItems  = entities.info.total_items;
    $scope.limit       = entities.info.limit || 10;
    $scope.offset      = entities.info.offset || 0;
    
    /*
      Load graph data
    */
    $scope.syncGraph = function() {
      relatedVizFactory.get({
        id: $stateParams.id,
        model: model,
        type: 'graph',
        limit: 1000
      }, function(res) {
        $scope.setGraph(res.result.graph)
      });
    }
    
    $scope.sync = function() {
      $scope.loading = true;
      relatedFactory.get(angular.extend({}, $scope.params, {
        id: $stateParams.id,
        model: model,
        limit: $scope.limit,
        offset: $scope.offset
      }), function (res) {
        $scope.loading = false;
        $scope.offset  = res.info.offset;
        $scope.limit   = res.info.limit;
        if($scope.offset > 0)
          $scope.addRelatedItems(res.result.items);
        else
          $scope.setRelatedItems(res.result.items);
      })
    }
    
    $scope.$on(EVENTS.INFINITE_SCROLL, function (e) {
      $scope.offset = $scope.offset + $scope.limit;
      $log.debug('EntitiesCtrl @INFINITE_SCROLL', '- skip:',$scope.offset,'- limit:', $scope.limit);
      
      $scope.sync();
    });
    
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      // reset offset
      $scope.offset = 0;
      $log.debug('EntitiesCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
    });
    
    $scope.setRelatedItems(entities.result.items);
    $scope.syncGraph();
  });

// .controller('EntitiesCtrl', function ($scope, $log, $stateParams, entities, model, relatedFactory, relatedVizFactory, EVENTS){
//   $log.log('EntitiesCtrl ready - model:', model, entities.info.total_items);
//   $scope.model = model
//   /*
//     Load graph data
//   */
//   relatedVizFactory.get({
//     id: $stateParams.id,
//     model: model,
//     type: 'graph',
//     limit: 1000
//   }, function(res) {
//     $scope.setGraph(res.result.graph)
//   });
    
//   /*
//     Reload related items, with filters.
//   */
//   $scope.sync = function(params) {
//     $scope.loading = true;
//     relatedFactory.get({
//       id: $stateParams.id,
//       model: model,
//       limit: 10,
//       offset: (params.page-1) * 10
//     }, function (res) {
//       $scope.loading = false;
//       $scope.setRelatedItems(res.result.items);
//     })
//   }
  
//   $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
//     $log.debug('ResourceCtrl @PAGE_CHANGED', params);
//     $scope.page = params.page
//     $scope.sync(params);
//   });
  
//   $scope.totalItems  = entities.info.total_items;
//   $scope.limit       = 10;
//   $scope.page        = 1;
//   $scope.setRelatedItems(entities.result.items);
// })