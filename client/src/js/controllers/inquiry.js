/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('InquiryCtrl', function ($scope, $log, $stateParams, inquiry, ResourceFactory, CommentFactory, InquiryRelatedFactory, socket) {
    $log.debug('InquiryCtrl ready, resource id:', $stateParams.id, '- inquiry id:', $stateParams.inquiry_id);
    
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
      vote up
    */
    $scope.upvote = function(comment) {
      console.log(comment)
      CommentFactory.upvote(comment).then(function(res) {
        console.log(res)
      });
    }
    $scope.downvote = function(comment) {
      console.log(comment)
      CommentFactory.downvote(comment).then(function(res) {
        console.log(res)
      });
    }
    /**
      vote down
    */
    /**
      on load
    */
    $scope.inquiry = inquiry.result.item;

    
    // list of ids, without any scope
    var relatedItemsIds = [];
    
    // load related items
    InquiryRelatedFactory.get({
      id: +$stateParams.inquiry_id,
      model: 'comment'
    }, function(data) {
      // $scope.relatedItems = data.result.items;
      relatedItemsIds = data.result.items.map(function (d) {return d.id});
    })
    
    /*
      listeners for creations
    */
    socket.on('done:create_comment', function (result) {
      // a comment has been added.
      $log.log('socket@done:create_comment / InquiryCtrl', result);
      // if(result.doi == $scope.inquiry.id) {
      //   InquiryRelatedFactory.get({
      //     id: +$stateParams.inquiry_id,
      //     model: 'comment'
      //   }, function(data) {
      //     $scope.relatedItems = data.result.items;
      //   })
      // }
      // create and sort?
      // if(relatedItemsIds.indexOf(result.data.id) == -1
      // for(var i in $scope.relatedItems) {
      //   if($scope.relatedItems[i].id == result.data.id) {
      //     $scope.relatedItems[i] = result.data;
      //   }
      // }
    });
    
    socket.on('done:update_comment', function (result) {
      // check if you're looking at the same
      $log.log('socket@done:update_comment / InquiryCtrl #comment_id =', result.data.id);
      
      for(var i in $scope.relatedItems) {
        if($scope.relatedItems[i].id == result.data.id) {
          $scope.relatedItems[i] = result.data;
        }
      }
    });

  })
  .controller('InquiryCreateCtrl', function ($scope, $log, $stateParams, $location, ResourceRelatedFactory, socket) {
    $log.debug('InquiryCreateCtrl ready, resource id:', $stateParams.id, 'loaded');
    
    // the current, empty inquiry
    $scope.inquiry = {
      name: '',
      description: 'Basic Multiline description\nWith more text than expected'
    };
    /*
    
      Create a new inquiry
      ----------------------
    */
    $scope.createInquiry = function() {
      // validate content, otherwise launch alarm!
      $log.debug('InquiryCreateCtrl -> createInquiry()', $scope.inquiry);
      if($scope.inquiry.name.trim().length > 3) {
        ResourceRelatedFactory.save({
          id: $stateParams.id,
          model: 'inquiry'
        }, angular.copy($scope.inquiry), function (data) {
          $log.debug('InquiryCreateCtrl -> createInquiry() success', data.result.item.id);
          // redirect...
          // $location.path('/i/' + data.result.item.id)
        })
      };
    }
   
  })
  .controller('InquiriesCtrl', function ($scope, $log, $stateParams, inquiries, socket) {
    $log.debug('InquiriesCtrl ready', $stateParams.id, 'loaded', inquiries);
    $scope.relatedItems = inquiries.result.items
    $scope.totalItems = inquiries.info.total_count || 0
    
  })