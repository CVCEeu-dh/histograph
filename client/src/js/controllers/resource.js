/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('ResourceCtrl', function ($scope, $log, $stateParams, $filter, resource, annotations, ResourceRelatedVizFactory, ResourceRelatedFactory, socket, EVENTS) {
    $log.debug('ResourceCtrl ready', annotations);
    
    $scope.notes = annotations.result.items;
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
      Favourite the current resource ♥
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
    
    $scope.unfavourite = function() {
      ResourceRelatedFactory.delete({
        id: $stateParams.id,
        model: 'user',  
      }, {}, function (res) {
        console.log('ResourceCtrl -> unfavourite() - result:', res.status);
        $scope.isFavItem = false;
      });
    };
    /*
      loadAnnotations
      ---

      Load notes attached to the current id
    */
    $scope.loadAnnotations = function(options, next) {

      next(
        $scope.notes.map(function (d) {

          return _.assign({}, d.props.annotation, {
            "annotator_schema_version": "v1.0",        // schema version: default v1.0
     "created": "2011-05-24T18:52:08.036814",   // created datetime in iso8601 format (added by backend)
     "updated": "2011-05-26T12:17:05.012544",   // updated datetime in iso8601 format (added by backend)
           "text": "eh",
           "author": d.performed_by,
           "mentions": d.mentioning,       
          });

        })
      );
    //     [
    //     {
    //       "id": "39fc339cf058bd22176771b3e3187329",  // unique id (added by backend)
    // "annotator_schema_version": "v1.0",        // schema version: default v1.0
    // "created": "2011-05-24T18:52:08.036814",   // created datetime in iso8601 format (added by backend)
    // "updated": "2011-05-26T12:17:05.012544",   // updated datetime in iso8601 format (added by backend)
    //       "text": "A note I wrote",                  // content of annotation
    //       "quote": "the text that was annotated",    // the annotated text (added by frontend)
    //       "uri": "http://example.com",          
    //       "ranges": [{
    //           end: "/blockquote[1]/p[1]",
    //           endOffset: 222,
    //           start: "/blockquote[1]/p[1]",
    //           startOffset: 208,
    //         }
    //       ]
    //     }
    //   ]);
    };

    /*
    
      Sockets
      ---
    */
    socket.on('resource:create-related-user:done', function (result) {
      if(result.id == $stateParams.id) { // update user notificaation
        $log.info('ResourceCtrl socket@resource:create-related-user:done - by:', result.user);
        if(result.user.id == $scope.user.id) {
          $scope.isFavItem = true;
        }
        $scope.item.lovers = $scope.item.lovers+1
      }
    })

    socket.on('resource:remove-related-user:done', function (result) {
      if(result.id == $stateParams.id) { // update user notificaation
        $log.info('ResourceCtrl socket@resource:remove-related-user:done - by:', result.user);
        if(result.user.id == $scope.user.id) {
          $scope.isFavItem = false;
        }
        $scope.item.lovers = $scope.item.lovers-1
      }
    })

    socket.on('entity:create-related-resource:done', function (result) {
      console.log(result)
      if(result.resource.id == $stateParams.id) { // update user notificaation)
        $log.info('ResourceCtrl socket@entity:create-related-resource:done - by:', result.user);
        // change the tags...
        $scope.item = result.data.related.resource; 
        $scope.$parent.$broadcast(EVENTS.API_PARAMS_CHANGED);
      }
    });

    socket.on('entity:upvote-related-resource:done', function (result) {
      console.log(result)
      if(result.resource.id == $stateParams.id) {
        $log.info('ResourceCtrl socket@entity:upvote-related-resource:done - by:', result.user);
        $scope.item = result.data.related.resource; 
      } // update user notificaation
        
    })

    socket.on('entity:downvote-related-resource:done', function (result) {
      console.log(result)
      if(result.resource.id == $stateParams.id) { // update user notificaation
        $log.info('ResourceCtrl socket@entity:downvote-related-resource:done - by:', result.user);
        $scope.item = result.data.related.resource; 
      } 
    })

    socket.on('entity:remove-related-resource:done', function (result) {
      console.log(result)
      if(result.resource.id == $stateParams.id) { // update user notificaation
        $log.info('ResourceCtrl socket@entity:remove-related-resource:done - by:', result.user);
        $scope.item = result.data.related.resource; 
      } 
    })

    $scope.switchVersion = function(version) {
      $log.info('resourceCtrl.switchVersion', version)
      $scope.currentVersion = version;
    };

    $scope.switchAnnotation = function(annotation) {
      $scope.currentAnnotation = annotation;
    };

    /*
      Enable the entity to resource creation. Close the dropdown by addign a dummy suggest
    */
    $scope.suggestEntityFromTypeahead = function($item, $model) {
      $log.log('ResourceCtrl -> suggestEntityFromTypeahead()', $item, $model)
      
    };




    



    // $scope.isFavItem = resource.result.item.filter(function(d) {
    //   return d.curators.length && _.find(d.curators, {}
    // }).length
    $scope.isFavItem = resource.result.item.loved_by_user;
    
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

    $scope.positions = yamls;
    
    $scope.currentVersion =  resource.result.item.positionings[0];//$scope.mergedVersion;
    
    
      // get theaccepted version
    //
    
    $scope.graphType = 'monopartite-entity'
    
    /**
      on load
    */
    $scope.item = angular.extend({ type: 'resource'}, resource.result.item);
    
    
    
  });