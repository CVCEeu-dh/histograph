/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('InquiryCtrl', function ($scope, $log, $routeParams, inquiry, ResourceFactory, InquiryRelatedFactory, socket) {
    $log.debug('InquiryCtrl reource id:', $routeParams.id, 'inquiry loaded', inquiry);
    
    $scope.comment = {};
    /*
    
      Create a new comment
      ----------------------
    */
    $scope.createComment = function() {
      $log.debug('InquiryCtrl -> createComment()', $scope.comment);
      
      InquiryRelatedFactory.save({
        id: $scope.inquiry.id,
        model: 'comment'
      }, {
        content: $scope.comment.content
      }, function(data) {
        $log.debug('InquiryCtrl -> createComment() success', data);
        $scope.comment = {};  
      })
    };
    /**
      on load
    */
    $scope.inquiry = inquiry.result.item;
    // get the related resource
    ResourceFactory.get({
      id: +$scope.inquiry.questioning
    }, function(data){
      $scope.item = data.result.item;
    });
    
    
    // load related items
    InquiryRelatedFactory.get({
      id: +$scope.inquiry.id,
      model: 'comment'
    }, function(data) {
      $scope.relatedItems = data.result.items;
    })
    
    // listeners for creations
    socket.on('done:create_comment', function (result) {
      // a comment has been added.
      $log.log('socket@done:create_comment / InquiryCtrl', result);
    });
    
    
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
  .controller('InquiryCreateCtrl', function ($scope, $log, $routeParams, $location, resource, ResourceRelatedFactory, socket) {
    $log.debug('InquiryCreateCtrl ready', $routeParams.id, 'loaded');
    
    /*
    
      Create a new inquiry
      ----------------------
    */
    $scope.createInquiry = function() {
      // validate content, otherwise launch alarm!
      $log.debug('InquiryCreateCtrl -> createInquiry()', $scope.inquiry);
      if($scope.inquiry.name.trim().length > 3) {
        ResourceRelatedFactory.save({
          id: $routeParams.id,
          model: 'inquiry'
        }, angular.copy($scope.inquiry), function (data) {
          $log.debug('InquiryCreateCtrl -> createInquiry() success', data.result.item.id);
          // redirect...
          $location.path('/i/' + data.result.item.id)
        })
      };
    }
    
    /**
      on load
    */
    $scope.item = resource.result.item;
    
    /*
      the current inquiry
    */
    $scope.inquiry = {
      name: '',
      description: 'Basic Multiline description\nWith more text than expected'
    }
    
    /*
      Set graph title
    */
    // $scope.setHeader('graph', 'neighborhood for the document "' + $filter('title')(resource.result.item.props, $scope.language, 24) + '"');
    $scope.setGraph({
      nodes: [],
      edges: []
    });
  })
  .controller('InquiriesCtrl', function ($scope, $log, $routeParams, resource, inquiries, socket) {
    $log.debug('InquiriesCtrl ready', $routeParams.id, 'loaded', inquiries);
     /**
      on load
    */
    $scope.item = resource.result.item;
    //$scope.setRelatedItems(inquiries.result.items);
    $scope.relatedItems = inquiries.result.items
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