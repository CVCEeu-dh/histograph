/**
 * @ngdoc function
 * @name histograph.controller:SearchCtrl
 * @description
 * # SearchCtrl
 */
angular.module('histograph')
  .controller('SearchCtrl', function ($scope, $log, $stateParams, socket, SuggestFactory, stats, EVENTS) {
    $log.debug('SearchCtrl ready, query "', $stateParams.query, '" matches', stats);
    
  })