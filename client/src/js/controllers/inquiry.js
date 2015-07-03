/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('InquiryCtrl', function ($scope, $log, $routeParams, inquiry, ResourceFactory, socket) {
    $log.debug('InquiryCtrl ready', $routeParams.id, 'loaded', inquiry);
     /**
      on load
    */
    ResourceFactory.get({
      id: +inquiry.result.item.questioning
    }, function(data){
      $scope.item = data.result.item;
    })
    
    //$scope.setInquiry(inquiry.result.item.props);
    $scope.setRelatedItems([inquiry.result.item]); // will put comments here
    
     // new inquiry
    /*
      Set graph title
    */
    // $scope.setHeader('graph', 'neighborhood for the document "' + $filter('title')(resource.result.item.props, $scope.language, 24) + '"');
    $scope.setGraph({
      nodes: [],
      edges: []
    })
  })
  .controller('InquiryCreateCtrl', function ($scope, $log, $routeParams, resource, socket) {
    $log.debug('InquiryCreateCtrl ready', $routeParams.id, 'loaded');
     /**
      on load
    */
    $scope.item = resource.result.item;
    $scope.setRelatedItems([]);
    
     // new inquiry
    /*
      Set graph title
    */
    // $scope.setHeader('graph', 'neighborhood for the document "' + $filter('title')(resource.result.item.props, $scope.language, 24) + '"');
    $scope.setGraph({
      nodes: [],
      edges: []
    })
  })
  .controller('InquiriesCtrl', function ($scope, $log, $routeParams, resource, inquiries, socket) {
    $log.debug('InquiriesCtrl ready', $routeParams.id, 'loaded', inquiries);
     /**
      on load
    */
    $scope.item = resource.result.item;
    $scope.setRelatedItems(inquiries.result.items);
    
     // new inquiry
    /*
      Set graph title
    */
    // $scope.setHeader('graph', 'neighborhood for the document "' + $filter('title')(resource.result.item.props, $scope.language, 24) + '"');
    $scope.setGraph({
      nodes: [],
      edges: []
    })
  })