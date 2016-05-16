/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('IndexCtrl', function ($scope, $log, ResourceFactory, EVENTS) {
    $log.debug('IndexCtrl ready', $scope.params);
  // the original index page, almost empty
  })
  
  .controller('ExploreCtrl', function ($scope, $log, $timeout, ResourceFactory, CooccurrencesFactory, cleanService, InquiryFactory, EVENTS) {
    $log.debug('ExploreCtrl ready', $scope.params);
    
    
    
    
    /*
      Set graph title
    */
    $scope.setHeader({
      graph: 'cooccurrences network of people connected if they appear in the same document',
      seealso: 'A list of resources to start with'
    });
    
   
    
    
    /*
      listener: $scope.timeline
      load the contextual timeline, if some filters are specified.
    */
    $scope.$watch('timeline', function (timeline) {
      if(!timeline)
        return;
      $log.log('IndexCtrl @timeline ready');
    });
    
    // start
    // $scope.sync();
    // $scope.syncGraph();
  })
  
  /*
    wall of issues
    ---
  */
  .controller('ExploreIssuesCtrl', function ($scope, $log, IssueFactory, EVENTS) {
    $log.debug('ExploreIssuesCtrl ready', $scope.params);
    $scope.limit  = 20;
    $scope.offset = 0;

    $scope.sync = function() {
      $scope.loading = true;
      IssueFactory.get(angular.extend({
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

      })
    };
    $scope.sync();
  })

  /*
    wall of noise
    ---
  */
  .controller('ExploreNoiseCtrl', function ($scope, $log, UserFactory, EVENTS) {
    $log.debug('ExploreNoiseCtrl ready', $scope.params);
    $scope.limit  = 20;
    $scope.offset = 0;

    $scope.sync = function() {
      $scope.loading = true;
      UserFactory.get(angular.extend({
        method: 'noise',
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

      })
    };

    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $scope.offset = 0;
      $log.debug('ExploreNoiseCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
      // $scope.syncGraph();
    });

    $scope.$on(EVENTS.INFINITE_SCROLL, function (e) {
      $scope.offset = $scope.offset + $scope.limit;
      $log.debug('ExploreCtrl @INFINITE_SCROLL', '- skip:',$scope.offset,'- limit:', $scope.limit);
      $scope.sync();
    });

    $scope.sync();
  })

  /*
    wall of resources
  */
  .controller('ExploreResourcesCtrl', function ($scope, $log, ResourceVizFactory, VIZ, ResourceFactory, EVENTS) {
    $log.debug('ExploreResourcesCtrl ready', $scope.params);
    $scope.limit  = 20;
    $scope.offset = 0;
    /*
      Reload related items, with filters.
    */
    $scope.sync = function() {
      $scope.lock('ExploreResourcesCtrl');
      ResourceFactory.get(angular.extend({
        limit: $scope.limit,
        offset: $scope.offset
      }, $scope.params), function (res) {
        $scope.unlock('ExploreResourcesCtrl');
        $scope.loading = false;
        $scope.offset  = res.info.offset;
        $scope.limit   = res.info.limit;
        $scope.setTotalItems(res.info.total_items);
        if($scope.offset > 0)
          $scope.addRelatedItems(res.result.items);
        else
          $scope.setRelatedItems(res.result.items);
        // reset if needed
        $scope.setFacets('type', res.info.groups);
        
      }) 
    }
    
    /*
      LoadTimeline
      ---

      load the timeline of filtered resources
    */
    $scope.syncTimeline = function() {
      if(!_.isEmpty($scope.params))
        ResourceVizFactory.get(angular.extend({
          viz: 'timeline'
        }, $scope.params), function (res) {
          // if(res.result.titmeline)
          $scope.setTimeline(res.result.timeline)
        });
      else
        $scope.setTimeline([])
    };

    /*
      listener: EVENTS.API_PARAMS_CHANGED
      some query parameter has changed, reload the list accordingly.
    */
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $scope.offset = 0;
      $log.debug('ExploreCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
      // $scope.syncGraph();
      $scope.syncTimeline();

    });
    
    $scope.$on(EVENTS.INFINITE_SCROLL, function (e) {
      $scope.offset = $scope.offset + $scope.limit;
      $log.debug('ExploreCtrl @INFINITE_SCROLL', '- skip:',$scope.offset,'- limit:', $scope.limit);
      $scope.sync();
    });

    if(!_.isEmpty($scope.params))
      $scope.syncTimeline();

    $scope.sync();
  })



