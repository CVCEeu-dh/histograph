/**
 * @ngdoc function
 * @name histograph.controller:GeoCtrl
 * @description
 * # GeoCtrl
 * Handle mapbox map with histograph data
 * 
 */
angular.module('histograph')
  .controller('ElasticCtrl', function ($scope, $log, $timeout, VisualizationFactory, EVENTS, SETTINGS) {
    $log.log('ElasticCtrl -> ready', $scope.filters, SETTINGS.types.entity);

    $scope.availableDimensions = ['entity'].concat(SETTINGS.types.entity);
    $scope.dimensions = [];
    $scope.dimension = 'entity'; // i.e, generic entity.

    $scope.values = [];
    $scope.facets = [];
    $scope.opened = false;

    var sync_timer;

    // load facet(s?)
    $scope.sync = function(){
      $scope.status = 'loading';
      if(sync_timer)
        $timeout.cancel(sync_timer)
      sync_timer = $timeout(function(){
        VisualizationFactory.resource('elastic', angular.extend({
          entity: $scope.dimension,
          limit: 50,
        }, $scope.params)).then(function(res) {
          $scope.status = 'idle';
          $scope.values = res.data.result.facets;
        });
      }, 500);
    };

    // toggle facet value
    $scope.toggleValue = function(value) {
      $scope.addFilter('with', value.id);
    } 

    // set dimension
    $scope.setDimension = function(dimension){
      $log.log('ElasticCtrl --> setDimension() dimension:', dimension);
      $scope.dimension = dimension;
      $scope.sync();
    };

    // watch status.
    $scope.$watch('opened', function(v){
      if(v === undefined)
        return;
      $log.log('ElasticCtrl @opened', v);
      $scope.sync()
    });

    // watch filters.
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function(e, params){
       $log.log('ElasticCtrl @API_PARAMS_CHANGED', params, $scope.filters);
       $scope.sync()
    });
  })