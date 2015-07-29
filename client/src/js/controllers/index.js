/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('IndexCtrl', function ($scope, $log, $timeout, ResourcesFactory, CooccurrencesFactory, cleanService, InquiryFactory, EVENTS) {
    
    $log.debug('IndexCtrl ready', $scope.params);
    
    $scope.pagetitle = 'A list of resources to start with'
    /*
      Reload resources according to scope params
    */
    $scope.sync = function(options) {
      $scope.setGraph({nodes:[], edges:[]});
      $scope.loading = true;
      var params = angular.copy($scope.params);
      if(options && options.page)
        params.offset = (options.page - 1)*($scope.limit || 10)
        
      ResourcesFactory.get(params, function (res) {
        $log.info('ResourceFactory', params, 'returned', res.result.items.length, 'items');
        $scope.setRelatedItems(res.result.items);
        $scope.totalItems = res.info.total_items;
        $scope.limit = res.info.params.limit;
        $scope.loading = false;
      });
      
      if(!options) {
        $scope.currentPage=1;
        $scope.syncGraph();
      }
        
       
      // InquiryFactory.get({limit: 20}, function(res) {
      //   console.log(res);
      //   $scope.inquiries = res.result.items
      // })
    };
    
    $scope.syncGraph = function() {
      CooccurrencesFactory.get($scope.params, function (res){
          res.result.graph.nodes.map(function (d) {
            d.color  = d.type == 'person'? "#D44A33": "#6891A2";
            d.type   = d.type || 'res';
            d.x = Math.random()*50;
            d.y = Math.random()*50;
            //d.label = d.name;
            return d;
          });
          $log.log('IndexCtrl CooccurrencesFactory returned a graph of',res.result.graph.nodes.length, 'nodes');
          $scope.setGraph(res.result.graph)
        });
    };
    
    /*
      Set graph title
    */
    $scope.setHeader({
      graph: 'cooccurrences network of people connected if they appear in the same document',
      seealso: 'A list of resources to start with'
    });
    
    /*
      clean previous graph
    */
    $scope.setGraph({nodes:[], edges:[]})
     
    
    
    /*
      listener: EVENTS.API_PARAMS_CHANGED
      some query parameter has changed, reload the list accordingly.
    */
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $log.log('IndexCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
    });
    $scope.$on(EVENTS.PAGE_CHANGED, function(e, params) {
      $log.log('IndexCtrl @PAGE_CHANGED', params);
      $scope.sync(params);
    });
    $scope.sync();
    
    /*
      listener: $scope.timeline
      load the contextual timeline, if some filters are specified.
    */
    $scope.$watch('timeline', function (timeline) {
      if(!timeline)
        return;
      $log.log('IndexCtrl @timeline ready');
    });
  })