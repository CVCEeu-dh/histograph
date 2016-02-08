/**
 * @ngdoc function
 * @name histograph.controller:CrowdCtrl
 * @description
 * # CrowdCtrl
 * Handle user notifications only
 * 
 */
angular.module('histograph')
  .controller('PulseController', function($scope, $log, $timeout, UserFactory, socket) {
    var popper;

    $scope.pulsations = 0;
    $scope.totalItems = 0;
    $scope.notifications = [];
    

    $log.debug('PulseController ready');
    // get inscribed to sockets...

    $scope.ping = function(message) {
      if(popper)
        $timeout.cancel(popper);

      $log.log('PulseController->ping() sending...');

      UserFactory.get({
        method: 'pulsations'
      }, function(res) {
        $log.log('PulseController->ping() received:', res);
        $scope.pulsations = res.info.total_items;
      })
      //if(message.user != $scope.user.username)
    };
    
    $scope.agreeEntityWrongIssue = function(relatedItem) {
      for(var i in relatedItem.entities)
        $scope.signale(relatedItem.entities[i])

    }

    $scope.disagreeEntityWrongIssue = function(elementToUpvote, action) {
      
    }

    $scope.toggle = function(open){
      if(!open)
        return;
      $scope.sync();
    }
    /*
      Load the last activity connected somehow with the current authentified user
    */
    $scope.sync = function() {
      $scope.syncing = true;

      UserFactory.get({
        method: 'pulse',
        limit: 5
      }, function(res) {
        $log.log('PulseController->sync() received:', res);
        $scope.totalItems = res.info.groups.total_items;

        $scope.notifications = res.result.items.map(function(d) {
          if(['APPEARS_IN_RELATIONSHIP', 'LIKES_RELATIONSHIP', 'ENTITY_LABEL', 'ENTITY_WRONG'].indexOf(d.props.target) !== -1){
            d.resource = _.find(d.mentioning, {type: 'resource'});
            d.entities   = _.filter(d.mentioning, function(d){
              return ['person', 'location', 'organization'].indexOf(d.type) !== -1;
            });
          }
          if(['ENTITY_LABEL'].indexOf(d.props.target) !== -1){
            // d.issue    = _.find(d.mentioning, function(d));
          }
          return d;
        });
        $scope.syncing = false;
      })
    };

    socket.on('resource:create-related-user:done', $scope.ping);
    socket.on('entity:create-related-resource:done', $scope.ping);
    socket.on('entity:downvote-related-resource:done', $scope.ping);
    socket.on('entity:upvote-related-resource:done', $scope.ping);
    socket.on('entity:create-related-issue:done', $scope.ping);
    // after 5 seconds
    popper = $timeout($scope.ping, 4000);
  })
