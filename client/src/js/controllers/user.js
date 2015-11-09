/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('UserCtrl', function ($scope, $log, pulse, socket) {
    $log.debug('UserCtrl ready', 'loaded', pulse);
    $scope.perspectiveItems = pulse.result.items;
  })
  .controller('UsersCtrl', function ($scope, $log, $stateParams, users, socket) {
    $log.debug('UsersCtrl ready', $stateParams.id, 'loaded', users);
    $scope.relatedItems = users.result.items;
    $scope.totalItems = users.info.total_count || 0;
  });