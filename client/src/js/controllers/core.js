/**
 * @ngdoc function
 * @name histograph.controller:CoreCtrl
 * @description
 * # CoreCtrl
 * Main controller, handle socket/io bridging for notification
 * It is the parent of the other controllers.
 */
angular.module('histograph')
  .controller('CoreCtrl', function ($scope, $log, $timeout, socket) {
    $log.debug('CoreCtrl ready');
    
    /*
      Create a comment, twetterlike wherever you are.
      (of course you have to comment a resource)
    */
    $scope.mention = function(item) {
      $log.debug('core.mention', item);
      socket.emit('start:mention', item.props, function (result) {
        $log.info('start:mention', result);
      });
    };
  })