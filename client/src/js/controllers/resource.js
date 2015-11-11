/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $stateParams, $filter, resource, ResourceRelatedVizFactory, ResourceRelatedFactory, socket, EVENTS) {
    $log.debug('ResourceCtrl ready');
    
    
    /*
      set see also title
    */
    $scope.pagetitle = 'related documents';
   
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
    
    /*
      Favourite the current resource :D  
    */
    $scope.favourite = function() {
      ResourceRelatedFactory.save({
        id: $stateParams.id,
        model: 'user',  
      }, {}, function (res) {
        console.log('ResourceCtrl -> favourite() - result:', res.status);
        $scope.isFavItem = true;
      });
    }
    
    /*
    
      Sockets
      ---
    */
    socket.on('resource:create-related-user:done', function (result) {
      console.log(result)
      if(result.id == $stateParams.id) // update user notificaation
        $log.info('ResourceCtrl socket@resource:create-related-user:done - by:', result.user);
    })


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
    $scope.item = angular.extend({ type: 'resource'}, resource.result.item);
    // $scope.isFavItem = resource.result.item.filter(function(d) {
    //   return d.curators.length && _.find(d.curators, {}
    // }).length
    $scope.isFavItem = typeof _.find(resource.result.item.curators, {id: $scope.user.id}) == 'object'
    
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
    //
    
    $scope.graphType = 'monopartite-entity'
    
    
  
    
    /**
      Annotations
      watch language - moved to a proper template, language driven
    */
    // $scope.$watch('language', function (language) {
    //   if($scope.item.annotations.length) {
    //     // evaluate according to language ...
    //     for( var i in $scope.item.annotations) {
    //       if($scope.item.annotations[i].language == $scope.language) {
    //         $scope.currentAnnotation = $scope.item.annotations[i];
    //         break;
    //       }
    //     }
        
    //   }
    // });
    
    
  });