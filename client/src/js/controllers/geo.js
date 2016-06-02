/**
 * @ngdoc function
 * @name histograph.controller:GeoCtrl
 * @description
 * # GeoCtrl
 * Handle mapbox map with histograph data. Listen to global params filtering and change the data points if the filters are changed.
 * Exclude obviously boundaries changes (cfr. getFiltersWithoutGeo() )
 * 
 */
angular.module('histograph')
  .controller('GeoCtrl', function ($scope, $log, points, VisualizationFactory, EVENTS) {
    $log.log('GeoCtrl -> ready', $scope.params);

    $scope.points = points;

    // current valude of the filtering hash without bounds param
    var hash = getFiltersWithoutGeo($scope.params);

    // get the list of filters, sorted by key; bounds param is excluded.
    function getFiltersWithoutGeo(params){
      return _(params)
        .omit('bounds')
        .map(function(v,k){
          return k + '=' + v;
        })
        .value()
        .sort()
        .join('-');
    };

    // on param changed, update the geo points only when needed (again, geo boundaries are excluded).
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function(e, params){
      var _hash = getFiltersWithoutGeo(params);
      if(hash != _hash){
        $log.debug('GeoCtrl @API_PARAMS_CHANGED (geo boundaries are excluded)');
        VisualizationFactory.geo(params).then(function(res){
          $scope.points = res.data.result.items
        });
      }
      hash = _hash;
    });
  })