/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $routeParams, ResourceFactory, ResourceCommentsFactory, ResourceRelatedFactory, socket) {
    $log.debug('ResourceCtrl ready', $routeParams.id);

    

    

    /**
      commenting, with socket
    */
    $scope.commenting = false; // on commenting = true
    
    $scope.comment = {
      text: "Write something please. Then do not forget to push the button below",
      tags: ''
    }


    /**
      Socket
    */


    socket.on('done:commenting', function (result) {
      $log.info('done:commenting', result);
    });

    socket.on('continue:commenting', function (result) {
      $log.info('continue:commenting', result);
    });

    socket.on('start:commenting', function (result) {
      $log.info('start:commenting', result.data, $routeParams.id);
    });

    /*
      Create a comment, twetterlike wherever you are.
      (of course you have to comment a resource)
    */
    $scope.startMention = function (item) {
      $log.debug('resource.startMention', item);
      $scope.commenting = true;
      socket.emit('start:commenting', item.props, function (result) {
        $log.info('start:commenting', result);
      });

    };

    $scope.postMention = function (item) {
      $log.debug('resource.postMention', item);
      ResourceCommentsFactory.save({id: $routeParams.id}, {
        content: $scope.comment.text,
        tags: ''
      }, function(res){
        console.log('postMention', res);
      })
    };


    $scope.switchVersion = function(version) {
      $log.info('resourceCtrl.switchVersion', version)
      $scope.currentVersion = version;
    };

    $scope.switchAnnotation = function(annotation) {
      $scope.currentAnnotation = annotation;
    }
    /**
      on load
    */
    ResourceFactory.get({id:$routeParams.id}, function (res) {
      $log.info('ResourceFactory', res);
      $scope.setUser(res.user); // update user
      // $scope.currentVersion = res.result.item.versions[1];
      // merge all versions (simply concat annotations and join them with entity URI if any matches identification)
      var yamls = [];
      res.result.item.versions.forEach(function(v) {
        if(typeof v.yaml == 'object')
          yamls = yamls.concat(v.yaml);
      });

      $scope.mergedVersion = {
        service: 'merged',
        yaml: yamls
      };
      $scope.currentVersion = $scope.mergedVersion;
      
      $scope.item = res.result.item;
      
      if($scope.item.annotations.length)
        $scope.currentAnnotation = $scope.item.annotations[0];
      else 
        $scope.currentAnnotation = { annotations: {
            source: $scope.item.props.source || '',
            caption: $scope.item.props.caption || '',
          }
        }
      // get theaccepted version

      // get related
      ResourceRelatedFactory.get({id:$routeParams.id}, function (res) {
        $log.info('ResourceRelatedFactory', res.result);
        $scope.related = res.result.items
      });
    });
  })