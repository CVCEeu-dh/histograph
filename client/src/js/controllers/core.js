/**
 * @ngdoc function
 * @name histograph.controller:CoreCtrl
 * @description
 * # CoreCtrl
 * Main controller, handle socket/io bridging for notification
 * It is the parent of the other controllers.
 */
angular.module('histograph')
  .controller('CoreCtrl', function ($scope, $log, $timeout, $http, socket) {
    $log.debug('CoreCtrl ready');
    
    var suggestionTimeout = 0;
    
    // the paths followed by a single user
    $scope.trails = [];
        
    // the current user
    $scope.user = {};

    $scope.setUser = function (user, update) {
      if(update || !$scope.user.id)
        $scope.user = user;
    };

    /*
      Will automatically update the graph view
      according tho the nodes edges propsed here.
      @param graph    - a collection of nodes and edges given as lists
      
    */
    $scope.setGraph = function(graph) {
      $scope.graph = graph;
    };
    
    $scope.suggest = function(query) {
      $log.info('CoreCtrl -> suggest', query);
      return $http.get('/api/suggest', {
        params: {
          query: query
        }
      }).then(function(response){
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
      console.log(arguments)
      $scope.target = {
        event: e,
        item: item,
        tag: tag,
        hashtag: hashtag
      };
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
    
    $scope.$on('$locationChangeSuccess', function(e, path) {
      $log.debug('CoreCtrl @locationChangeSuccess', path)
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
  })