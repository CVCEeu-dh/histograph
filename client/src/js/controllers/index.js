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
      
      // get co-occurrence network
      
    });
    
    CooccurrencesFactory.get({limit: 1000}, function (res){
    	console.log("reporieporieporipeor")
      	var graph = {
		          nodes: [],
		          edges: []
		        },
		        nodes = {};
        
        
        for(var i in res.result.items) {
        	graph.edges.push({
            id: +(res.result.items[i].source.id+'.'+res.result.items[i].target.id),
            source: res.result.items[i].source.id,
            target:  res.result.items[i].target.id,
            weight: res.result.items[i].weight,
            color: "#a3a3a3"
          });
          
          if(!nodes[res.result.items[i].source.id]){
            nodes[res.result.items[i].source.id] = {
              id: res.result.items[i].source.id,
              label: res.result.items[i].source.name,
              x: Math.random()*50,
            	y: Math.random()*50,
              color: "#D44A33",
              //size: 0
            };
            graph.nodes.push(nodes[res.result.items[i].source.id]);
          }
          if(!nodes[res.result.items[i].target.id]){
            nodes[res.result.items[i].target.id] = {
              id: res.result.items[i].target.id,
              label: res.result.items[i].target.name,
              x: Math.random()*50,
            	y: Math.random()*50,
              color: "#D44A33",
              
            };
            graph.nodes.push(nodes[res.result.items[i].target.id]);
          }
        };
        
        $scope.setGraph(graph);
      })
  })