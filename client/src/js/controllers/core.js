/**
 * @ngdoc function
 * @name histograph.controller:CoreCtrl
 * @description
 * # CoreCtrl
 * Main controller, handle socket/io bridging for notification
 * It is the parent of the other controllers.
 */
angular.module('histograph')
  .controller('CoreCtrl', function ($scope, $location, $routeParams, $log, $timeout, $http, socket, ResourceCommentsFactory, SuggestFactory) {
    $log.debug('CoreCtrl ready');
    $scope.locationPath = $location.path(); 
    
    var suggestionTimeout = 0;
    
    // the paths followed by a single user
    $scope.trails = [];
    
    // playlist of nodes ... :D
    $scope.playlist = [];
    
    // the current user
    $scope.user = {};
    
    // the current search query, if any
    $scope.query =  $routeParams.query || '';
    

    $scope.setUser = function (user, update) {
      if(update || !$scope.user.id)
        $scope.user = user;
    };
    
    /**
     handle redirection from directive
     */
    $scope.redirect = function(path) {
      $log.info('CoreCtrl redirect to', path)
      $location.path(path);
      $scope.$apply();
    };
    /*
      Will automatically update the graph view
      according tho the nodes edges propsed here.
      @param graph    - a collection of nodes and edges given as lists
      
    */
    $scope.setGraph = function(graph) {
      $log.info('CoreCtrl -> setGraph', graph.nodes.length, 'nodes', graph.edges.length, 'edges')
      $scope.graph = graph;
    };
    
    $scope.suggest = function(query) {
      $log.info('CoreCtrl -> suggest', query);

      return $http.get('/api/suggest', {
        params: {
          query: query
        }
      }).then(function(response){
        console.log(response)
        return response.data.result.items
      });
    };
    
    /*
      Open entity contextual menu
      ---------------------------
      
    */
    $scope.target;
    /*
      Open the contextual menu for something.
      
      @param e        - passed with $event, allow to repoisition the pop object
      @param item     - the item which contain the tag or the label.
      @param tag      - the entity instance for precise commenting purposes.
      @param hashtag  - istead of using target, a hashtag
    */
    $scope.toggleMenu = function(e, item, tag, hashtag) {
      $log.info('CoreCtrl -> toggleMenu()', e, item, tag)
      $scope.target = {
        event: e,
        item: item,
        tag: tag,
        hashtag: hashtag
      };
    };
    
    /*
      Commenting, everywhere
      ----------------------
    */
    $scope.commenting = false; // on commenting = true
    $scope.commented = {};
    
    $scope.comment = {
      text: "Write something please. Then do not forget to push the button below",
      tags: ''
    }
    
    // label should be in place if tag is an angular object.
    $scope.startCommenting = function(item, tag, label){
      $scope.commenting = true;
      $scope.commented = item;
      if(tag){
        if(typeof tag == 'string') {
          $scope.comment.tags = ['#' + tag];
          $scope.comment.text = '#' + tag;
        } else {
          $scope.comment.tags = ['#' + label + '-' + tag.id]
          $scope.comment.text = '#' + label + '-' + tag.id;
        }
      } else {
        $scope.comment.text = "something";
      }
      $log.info('ResourceCtrl -> startCommenting()');
      
      socket.emit('start:commenting', item.props, function (result) {
        
      });
    };
    
    $scope.postComment = function () {
      $log.debug('resource.postMention', $scope.commented);
      if($scope.comment.text.trim().length > 0 && $scope.commenting) {
        $scope.commenting = false;
        ResourceCommentsFactory.save({id: $scope.commented.id}, {
          content: $scope.comment.text,
          tags:  $scope.comment.tags
        }, function(res){
          
          console.log('postMention', res);
        })
      }
    };
    
    $scope.stopCommenting = function(item, tag, label){
        $scope.commenting = false;
        $scope.comment.tags = [];
        $scope.comment.text = ""
    };
    /*
    
      Following the trail
      -------------------
     */
    var Trail = function(path, start, index, level) {
      this.paths = [{
        path:  path,
        start: start
      }];
      this.index = index || 0;
      this.level = level || 0;
      this.start = start;
    };
    
    $scope.$on('$routeChangeSuccess', function(e, r) {
      $log.debug('CoreCtrl @routeChangeSuccess', r, r.$$route.controller);
      $scope.currentCtrl = r.$$route.controller;
      
      $scope.query = $routeParams.query || '';
    
    });
    
    $scope.$on('$locationChangeSuccess', function(e, path) {
      $log.debug('CoreCtrl @locationChangeSuccess', path);
      var now = (new Date()).getTime();
      
      if(!$scope.trails.length) { // hey this is your first trail
        $scope.trails.push(new Trail(path, now));
        return;
      };
      
      var trail;
      // check if the paths already exists in past trail and it is not the last one.
      for(var i = $scope.trails.length - 1; i > -1; i--) {
        for(var j = $scope.trails[i].paths.length - 1; j > -1 ; j--) {
          if($scope.trails[i].paths[j].path === path) { // create a new trail
            trail = new Trail(path, now, j, i);
            $scope.trails.push(trail);
            break;
          }
        }
        if(trail)
          break;
      };
      
      // the path is totally new, append it to the last trail paths
      if(!trail) 
        $scope.trails[$scope.trails.length - 1].paths.push({
          path: path,
          start: now
        });
    });
    
     /*
    
      Playlist
      --------
     */
     $scope.queue = function(item, inprog) {
      // load item by id ...
      $log.info('CoreCtrl -> queue', item, inprog? 'do not force update scope': 'force scope update')
      if(typeof item == 'object') {
        $scope.playlist.push(item);
        $scope.queueStatus = 'active';
      } else {
        SuggestFactory.getUnknownNode({
          id:item
        }).then(function (res) {
          $scope.playlist.push(res.data.result.item);
          $scope.queueStatus = 'active';
          if(!inprog)
            $scope.$apply();
          var ids = $scope.playlist.map(function (d) {
            return d.id
          });
          if($scope.currentCtrl == 'NeighborsCtrl') {
            $log.log('    redirect to: /#/neighbors/'+ids.join(',')); 
            $location.path('/neighbors/'+ids.join(','));
          } else if($scope.currentCtrl == 'AllShortestPathsCtrl') {
            $log.log('    redirect to: /#/ap/'+ids.join(','));
            $location.path('/ap/'+ids.join(','));
          }
        })
      }
      if(!inprog)
        $scope.$apply();
      
     }
     
    $scope.hideQueue = function(item) {
      $scope.queueStatus = 'sleep';
    }
    /*
      playlist syncQueue
      check that the playlist is filled with the given ids.
      Otherwise take care of sync.
      @param ids  - array of integer node ids
    */
    $scope.syncQueue = function(ids) {
      if(ids.length != $scope.playlist.length) {
        SuggestFactory.getUnknownNodes({
          ids: ids
        }).then(function (res) {
          $scope.playlist = res.data.result.items;
          $scope.queueStatus = 'active';
        });
      };
    };
     
    $scope.toggleQueue = function(item) {
    if($scope.queueStatus == 'sleep')
      $scope.queueStatus = 'active';
    else
      $scope.queueStatus = 'sleep';
    }
    
    // remove from playlist, then redirect.
    $scope.removeFromQueue = function(item) {
      $log.debug('NeighborsCtrl -> removeFromQueue()', item.id);
      var ids = [];
      for(var i = 0; i < $scope.playlist.length; i++) {
        if($scope.playlist[i].id == item.id) {
          $log.log('    remove', $scope.playlist[i].id);
          $scope.playlist.splice(i, 1);
          
        } else { // only for redirection purposes
          ids.push($scope.playlist[i].id);
        }
      }
      if($scope.currentCtrl == 'NeighborsCtrl') {
        $log.log('    redirect to: /#/neighbors/'+ids.join(',')); 
        $location.path('/neighbors/'+ids.join(','));
      } else if($scope.currentCtrl == 'AllShortestPathsCtrl') {
        $log.log('    redirect to: /#/ap/'+ids.join(','));
        $location.path('/ap/'+ids.join(','));
      }
      // $scope.playlist.forEach(function (d) {
      //   if(d.id == item.id) {
          
      //   }
      //     delete d;
      // });
      
      $log.debug('NeighborsCtrl redirect ', $scope.currentCtrl);
    };
    
  })