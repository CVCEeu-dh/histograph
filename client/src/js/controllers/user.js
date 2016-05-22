/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('UserCtrl', function ($scope, $log, pulse, UserRelatedVizFactory, socket, $stateParams, EVENTS) {
    $log.debug('UserCtrl ready', 'loaded', pulse);
    $scope.perspectiveItems = pulse.result.items;

    // set timeline items according to the current query
    $scope.syncTimeline = function() {
      UserRelatedVizFactory.get(angular.extend({
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
  .controller('UsersCtrl', function ($scope, $log, $stateParams, users, socket) {
    $log.debug('UsersCtrl ready', $stateParams.id, 'loaded', users);
    $scope.relatedItems = users.result.items;
    $scope.totalItems = users.info.total_count || 0;
  });