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
    $scope.item = resource.result.item;
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
    
    
  })
  .controller('ResourcesCtrl', function ($scope, $log, $stateParams, $filter, resources, relatedVizFactory, relatedFactory, socket, EVENTS) {
     /*
      set pagination
    */
    $scope.totalItems  = resources.info.total_items;
    $scope.limit       = resources.info.limit;
    $scope.offset      = resources.info.offset;
    // $scope.page        = 1; // always first page!!
    
    /*
      set order by
      according to the favourite orderby. Avoid default values.
    */
    if(resources.info.orderby != 'relevance')
      $scope.setSorting(resources.info.orderby);
    
    /*
      set facets
    */
    $scope.setFacets('type', resources.info.groups);
    
    $log.debug('ResourcesCtrl ready');
    /*
      Load graph data
    */
    relatedVizFactory.get({
      id: $stateParams.id,
      model: 'resource',
      type: 'graph',
      limit: 100,
      query:  $stateParams.query,
      ids:    $stateParams.ids,
    }, function(res) {
      if($scope.item && $scope.item.id)
        $scope.setGraph(res.result.graph, {
          centers: [$scope.item.id]
        });
      else
        $scope.setGraph(res.result.graph);
    });
    
    $log.log('ResourcesCtrl -> setRelatedItems - items', resources.result.items);
    $scope.setRelatedItems(resources.result.items);
    
      
    /*
      Reload related items, with filters.
    */
    $scope.sync = function() {
      $scope.loading = true;

      
        relatedFactory.get(angular.extend({
          id: $stateParams.id,
          query: $stateParams.query,
          model: 'resource',
          limit: $scope.limit,
          offset: $scope.offset
        }, $scope.params), function (res) {
          $scope.loading = false;
          $scope.offset  = res.info.offset;
          $scope.limit   = res.info.limit;
          $scope.totalItems = res.info.total_items;
          if($scope.offset > 0)
            $scope.addRelatedItems(res.result.items);
          else
            $scope.setRelatedItems(res.result.items);
          // reset if needed
          $scope.setFacets('type', res.info.groups);
          
        }) 
    };
    /*
      listener: EVENTS.API_PARAMS_CHANGED
      some query parameter has changed, reload the list accordingly.
    */
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      // reset offset
      $scope.offset = 0;
      $log.debug('ResourcesCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
    });
    // $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
    //   $log.debug('ResourcesCtrl @PAGE_CHANGED', params);
    //   $scope.page = params.page
    //   $scope.sync();
    // });
    
    $scope.$on(EVENTS.INFINITE_SCROLL, function (e) {
      $scope.offset = $scope.offset + $scope.limit;
      $log.debug('ResourcesCtrl @INFINITE_SCROLL', '- skip:',$scope.offset,'- limit:', $scope.limit);
      
      $scope.sync();
    });
  })