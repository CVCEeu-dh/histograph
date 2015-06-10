/**
 * @ngdoc function
 * @name histograph.controller:indexCtrl
 * @description
 * # IndexCtrl
 */
angular.module('histograph')
  .controller('IndexCtrl', function ($scope, $log, $timeout, ResourcesFactory, CooccurrencesFactory) {
    
    $log.debug('IndexCtrl ready');
    
    ResourcesFactory.get(function (res) {
      $log.info('ResourceFactory', res.result.items.length, res.result.items[0]);
      $scope.items = res.result.items;
    });
    
    /*
      Set graph title
    */
    $scope.setHeader('graph', 'cooccurrences network of people appearing in the same documents');
    
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
    })
  })