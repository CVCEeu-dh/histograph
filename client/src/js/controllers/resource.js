/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $routeParams, ResourceFactory, socket) {
    $log.debug('ResourceCtrl ready', $routeParams.id);
    
    ResourceFactory.get({id:$routeParams.id}, function (res) {
      $log.info('ResourceFactory', res.result);
      $scope.currentVersion = res.result.item.versions[1];
      $scope.item = res.result.item;
      // get theaccepted version

    });

    $scope.comment = "Write something please. Then do not forget to push the button below"
    /**
      Socket
    */
    socket.on('start:mention', function (result) {
      $log.info('start:mention', result.data.id, $routeParams.id);
    });

    /*
      Create a comment, twetterlike wherever you are.
      (of course you have to comment a resource)
    */
    $scope.startMention = function (item) {
      $log.debug('core.mention', item);
      socket.emit('start:mention', item.props, function (result) {
        $log.info('start:mention', result);
      });
    };

    $scope.postMention = function (item) {

    };


    $scope.switchVersion = function(version) {
      $log.info('resourceCtrl.switchVersion', version)
      $scope.currentVersion = version;
    };
  })