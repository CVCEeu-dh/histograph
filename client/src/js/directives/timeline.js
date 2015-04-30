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
  .directive('timeline', function($log) {
    return {
      restrict : 'A',
      scope:{
        graph: '='
      },
      link : function(scope, element, attrs) {
        var bounds = {
          min: 0,
          max: 0
        };
        
        // on graph change, change the timeline as well
        scope.$watch('graph', function (graph) {
          if(!graph || !graph.nodes)
            return;
          $log.info('::timeline n. nodes ');
          
          // computate min and max
          
        });
      }
    }
  });