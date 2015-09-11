/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('EntityCtrl', function ($scope, $log, $stateParams, socket, $filter, entity, resources, persons, EntityExtraFactory,EntityRelatedFactory, EVENTS) {
    $log.debug('EntityCtrl ready', +$stateParams.id);
    
    $scope.item = entity.result.item;
    $scope.setRelatedItems(resources.result.items);
    $scope.relatedPersons    = persons.result.items;
    
    $scope.pagetitle = 'related documents';
    $scope.totalItems = resources.info.total_items;
    $scope.limit = 10//resources.info.params.limit
    
     /*
      Set graph title
    */
    $scope.setHeader('graph', 'cooccurring entities for '+ $filter('title')(entity.result.item.props, $scope.language, 24) + '"');
    
    
    // cooccurrences
    $scope.graphType = 'monopartite-entity'
    // sync graph
    $scope.drawGraph = function() {
      EntityExtraFactory.get({
        id: $stateParams.id,
        extra: 'graph',
        type: $scope.graphType,
        limit: 2000
      }, function(res) {
        $log.log('res', res)
        res.result.graph.nodes.map(function (d) {
          d.color  = d.type == 'person'? "#D44A33": "#6891A2";
          d.type   = d.type || 'res';
          d.x = Math.random()*50;
          d.y = Math.random()*50;
          //d.label = d.name;
          return d;
        })
        $log.debug('EntityCtrl set graph',res.result.graph.nodes);
        
        // once done, load the other viz
        $scope.setGraph(res.result.graph)
      });
    };
    
    $scope.$watch('graphType', $scope.drawGraph)
    
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
  $log.log('EntitiesCtrl', entities.info.total_items);
  $scope.model = model
  /*
    Load graph data
  */
  relatedVizFactory.get({
    id: $stateParams.id,
    model: model,
    type: 'graph',
    limit: 100
  }, function(res) {
    $scope.setGraph(res.result.graph)
  });
    
  /*
    Reload related items, with filters.
  */
  $scope.sync = function(params) {
    $scope.loading = true;
    relatedFactory.get({
      id: $stateParams.id,
      model: model,
      limit: 10,
      offset: (params.page-1) * 10
    }, function (res) {
      $scope.loading = false;
      $scope.setRelatedItems(res.result.items);
    })
  }
  
  $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
    $log.debug('ResourceCtrl @PAGE_CHANGED', params);
    $scope.page = params.page
    $scope.sync(params);
  });
  
  $scope.totalItems  = entities.info.total_items;
  $scope.limit       = 10;
  $scope.page        = 1;
  $scope.setRelatedItems(entities.result.items);
})