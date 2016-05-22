/**
 * @ngdoc function
 * @name histograph.controller:GeoCtrl
 * @description
 * # GeoCtrl
 * Handle mapbox map with histograph data
 * 
 */
angular.module('histograph')
  .controller('ElasticCtrl', function ($rootScope, $scope, $log, $timeout, $stateParams, VisualizationFactory, ResourceRelatedVizFactory, EntityRelatedVizFactory, SearchVizFactory, EVENTS, SETTINGS) {
    $log.log('ElasticCtrl -> ready', $scope.filters, SETTINGS.types.entity, $scope.state);

    $scope.availableDimensions = ['entity'].concat(SETTINGS.types.entity);
    $scope.dimensions = [];
    $scope.dimension = 'entity'; // i.e, generic entity.

    $scope.values = [];
    $scope.opened = false;

    var sync_timer,
        dimension;

    // load facet(s?)
    $scope.sync = function(){
      $scope.status = 'loading';
      if(sync_timer)
        $timeout.cancel(sync_timer);
      if($scope.dimension == 'type'){
        $scope.status = 'idle';
        $scope.values = $scope.facets[$scope.dimension];
        return;
      }
      sync_timer = $timeout(function(){
        $scope.status = 'loading';
        var params =  angular.extend({
          entity: $scope.dimension,
          limit: 20,
        }, $scope.params);

        switch($scope.currentState.name){
          case 'resource.resources':
            ResourceRelatedVizFactory.get(angular.extend({
              id: $stateParams.id,
              viz: 'elastic',
              model: 'resource'
            }, params), function(res) {
              $scope.status = 'idle';
              $scope.values = res.result.facets;
            });
            break;
          case 'entity.resources':
            EntityRelatedVizFactory.get(angular.extend({
              id: $stateParams.id,
              viz: 'elastic',
              model: 'resource'
            }, params), function(res) {
              $scope.status = 'idle';
              $scope.values = res.result.facets;
            });
            break;
          case 'search.resources':
            SearchVizFactory.get(angular.extend({
              viz: 'elastic',
              model: 'resource'
            }, params, $stateParams),function(res) {
              $scope.status = 'idle';
              $scope.values = res.result.facets;
            });
            break;
          default:
            VisualizationFactory.resource('elastic', params).then(function(res) {
              $scope.status = 'idle';
              $scope.values = res.data.result.facets;
            })
            break;
        }
        
      }, 500);
    };

    // toggle global opened value
    $scope.toggleOpened = function(){
      $scope.opened = !$scope.opened;
    };
    
    // toggle single facet value    
    $scope.toggleValue = function(value) {
      $scope.addFilter('with', value.id);
    } 

    $scope.excludeValue = function(value) {
      $scope.removeFilter('with', value.id);
      $scope.addFilter('without', value.id);

    };

    // toggle group (e.g. resource type)
    $scope.toggleGroup = function(value) {
      $scope.addFilter('type', value.group);
    };

    // set dimension
    $scope.setDimension = function(dimension){
      $log.log('ElasticCtrl --> setDimension() dimension:', dimension);
      if(dimension != $scope.dimension){
        $scope.values = [];
        $scope.sync();
      }
      $scope.dimension = dimension;
    };

    // watch status.
    $scope.$watch('opened', function(v){
      if(!v)
        return;
      $log.log('ElasticCtrl @opened', v);

      $scope.sync()
    });

    // watch filterCtrl facets
    $scope.$watch('facets', function(v){
      if(!v || !$scope.opened)
        return;
      $log.log('ElasticCtrl @facets', v);
      $scope.sync();
    }, true);


    // watch filters.
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function(e, params){
       $log.log('ElasticCtrl @API_PARAMS_CHANGED', params, $scope.filters);
       $scope.sync()
    });


    // watch $stateChangeStart. Empty value list
    $rootScope.$on('$stateChangeStart', function (e, state) {
      $log.log('ElasticCtrl @stateChangeStart', state.name);
      $scope.values = [];
    });
  })