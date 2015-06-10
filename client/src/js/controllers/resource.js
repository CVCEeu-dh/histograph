/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $routeParams, $filter, resource, resources, ResourceVizFactory, ResourceCommentsFactory, socket) {
    $log.debug('ResourceCtrl ready', $routeParams.id, 'loaded', resource.result.item.id);

    /*
      Set graph title
    */
    $scope.setHeader('graph', 'neighborhood for the document "' + $filter('title')(resource.result.item.props, $scope.language, 24) + '"');
    
    /**
      controller to directive 
      change the focusId( cfr sigma directive) with either resource or entity id
      and enlighten it on the network
    */
    $scope.sigmaFocus = function(id) {
      $log.info('ResourceCtrl .sigmaFocus', id);
      $scope.focusId = id;
      $scope.$broadcast('focuson', {id:id});
    }

    /**
      commenting, with socket
    
    */
    socket.on('done:commenting', function (result) {
      
      // add the comment at the bottom
      if(result.resource_id != $routeParams.id)
        return;
      if(result.data.comment) {
        $log.info('done:commenting', result);
        result.data.props = result.data.comment;
        $scope.item.comments.push(result.data);
      } else {
        $log.error('done:commenting', 'comment invalid, please check');
      }
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
    
    // $scope.postMention = function (item) {
    //   $log.debug('resource.postMention', item);
    //   if($scope.comment.text.trim().length > 0 && $scope.commenting) {
    //     $scope.commenting = false;
    //     ResourceCommentsFactory.save({id: $routeParams.id}, {
    //       content: $scope.comment.text,
    //       tags:  $scope.comment.tags
    //     }, function(res){
          
    //       console.log('postMention', res);
    //     })
    //   }
    // };


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
    $scope.item = resource.result.item;
    
    $log.info('ResourceCtrl', resource);
    
    // merge all versions (simply concat annotations and join them with entity URI if any matches identification)
    
    var yamls = [];
    resource.result.item.positionings.forEach(function(v) {
      if(typeof v.yaml == 'object')
         yamls = yamls.concat(v.yaml);
    });

    $scope.mergedVersion = {
      service: 'merged',
      yaml: yamls
    };
    
    $scope.currentVersion =  resource.result.item.positionings[0];//$scope.mergedVersion;
    
    
      // get theaccepted version
    
    $scope.setRelatedItems(resources.result.items);
    
    $scope.graphType = 'monopartite-entity'
    
    // sync graph
    ResourceVizFactory.get({
      id: $routeParams.id,
      viz: 'graph',
      type: $scope.graphType,
      limit: 2000
    }, function(res) {
      $log.log('res', res)
      res.result.graph.nodes.map(function (d) {
        d.x = Math.random()*50;
        d.y = Math.random()*50;
        return d;
      });
      $log.debug('EntityCtrl set graph',res.result.graph.nodes);
      
      // once done, load the other viz
      $scope.setGraph(res.result.graph)
    });
    
    /**
      Annotations
      watch language
    */
    $scope.$watch('language', function (language) {
      if($scope.item.annotations.length) {
        // evaluate according to language ...
        for( var i in $scope.item.annotations) {
          if($scope.item.annotations[i].language == $scope.language) {
            $scope.currentAnnotation = $scope.item.annotations[i];
            break;
          }
        }
        
      }
    });
  })