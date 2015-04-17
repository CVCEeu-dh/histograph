'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * directive to show a grapgh of nodes and edges thanks to @Yomguithereal!!! 
 */
angular.module('histograph')
  .directive('sigma', function($log) {
    return {
      restrict : 'A',
      scope:{
        graph: '='
      },
      link : function(scope, element, attrs) {
        // Creating sigma instance
        var timeout,
            si = new sigma({
              //container: element[0],
              settings: {
                singleHover: true,
                minNodeSize: 2,
                maxNodeSize: 5,
                labelThreshold: 5
              }
            });
            // Creating camera
        var camera = si.addCamera('main');
        
        si.addRenderer({
          camera: 'main',
          container: element[0]
        });

        // once the container has benn added, add the commands
        // Helper rescale functions, with easing.
        function rescale() {
          sigma.misc.animation.camera(
            si.cameras.main,
            {x: 0, y: 0, angle: 0, ratio: 1.618},
            {duration: 150}
          );
        };

        
        // check for changes
        scope.$watch('graph', function (graph) {

          if(!graph || !graph.nodes)
            return;
          // stopping the timeout
          clearTimeout(timeout);

          // Killing ForceAtlas2, anyway
          si.killForceAtlas2();
          // Reading new graph
          si.graph.clear().read(graph);
          var layoutDuration = 4* si.graph.nodes().length * si.graph.edges().length
          $log.info('::sigma n. nodes', si.graph.nodes().length, ' n. edges', si.graph.edges().length, 'runninn layout atlas for', layoutDuration/1000, 'seconds')
          
          // local Degree for size
          // si.graph.nodes().forEach(function(n) {
          //   n.size = si.graph.degree(n.id);
          // });
          rescale();
          si.refresh();
          si.startForceAtlas2({
            linLogMode  : true
          });
          $log.info('::sigma force atlas started')
          
          timeout = setTimeout(function() {
            $log.info('::sigma kill force atlas on graph')
            si.killForceAtlas2();
            // kill force atlas 2 according to the edge/nodes density ratio.
            // a user can always start over the graph computatyion
          }, layoutDuration );
        });


      }
    }
  });
