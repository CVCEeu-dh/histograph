/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $stateParams, socket, SearchVizFactory, stats, EVENTS) {
    $log.debug('SearchCtrl ready, query "', $stateParams.query, '" matches', stats);
    
    // $scope.resourcesStats = _.filter(stats.info.groups, {group:'resource'});
    // $scope.entitiesStats  = _.filter(stats.info.groups, {group:'entity'});
    // /*
    	// Update stats on params update?
    // */
    
    // set timeline items according to the current query
    $scope.syncTimeline = function() {
      SearchVizFactory.get(angular.extend({
        model:'resource',
        viz: 'timeline'
      },  $stateParams, $scope.params), function (res) {
        // if(res.result.titmeline)
        $scope.setTimeline(res.result.timeline)
      });
    };

    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $log.debug('SearchCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.syncTimeline();
    });

    // load timeline
    $scope.syncTimeline();
  })