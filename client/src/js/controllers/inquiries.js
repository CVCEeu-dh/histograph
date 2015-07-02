/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('InquiriesCtrl', function ($scope, $log, $routeParams, resource, inquiries, socket) {
    $log.debug('InquiriesCtrl ready', $routeParams.id, 'loaded');
     /**
      on load
    */
    $scope.item = resource.result.item;
    
    
    /*
      Set graph title
    */
    // $scope.setHeader('graph', 'neighborhood for the document "' + $filter('title')(resource.result.item.props, $scope.language, 24) + '"');
    $scope.setGraph({
      nodes: [],
      edges: []
    })
  })