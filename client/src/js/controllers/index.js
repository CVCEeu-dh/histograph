/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('IndexCtrl', function (resources, $scope, $log, $timeout, ResourcesFactory, CooccurrencesFactory, cleanService, EVENTS) {
    
    $log.debug('IndexCtrl ready');
    $scope.$parent.showSpinner = false;
    
    $scope.setRelatedItems(resources.result.items); 
    /*
      Reload resources according to scope params
    */
    $scope.sync = function() {
      ResourcesFactory.get(cleanService.params($scope.params), function (res) {
        $log.info('ResourceFactory', res.result.items.length, res.result.items[0]);
        $scope.setRelatedItems(res.result.items);
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
     
    CooccurrencesFactory.get(function (res){
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
    
    /*
      listener: EVENTS.API_PARAMS_CHANGED
      some query parameter has changed, reload the list accordingly.
    */
    $scope.$on(EVENTS.API_PARAMS_CHANGED, function() {
      $log.log('IndexCtrl @API_PARAMS_CHANGED', $scope.params);
      $scope.sync();
    });
  })