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
        limit: 3
      }, function(res) {
        $log.log('PulseController->sync() received:', res);
        $scope.notifications = res.result.items.map(function(d) {
          if(['APPEARS_IN_RELATIONSHIP', 'LIKES_RELATIONSHIP'].indexOf(d.props.target) !== -1){
            d.resource = _.find(d.mentioning, {type: 'resource'});
            d.entity   = _.reject(d.mentioning, {type: 'resource'});
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

    // after 5 seconds
    popper = $timeout($scope.ping, 4000);
  })
