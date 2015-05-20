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
  .directive('sigma', function($log, $location) {
    return {
      restrict : 'A',
      template: ''+
        '<div id="playground"></div>' +
        '<div id="commands">' +
          '<div class="action {{status==\'RUNNING\'? \'bounceIn animated\': \'\'}}" ng-click="togglePlay()"><i class="fa fa-{{status==\'RUNNING\' ? \'stop\': \'play\'}}"></i></div>' +
          '<div class="action" ng-click="rescale()"><i class="fa fa-dot-circle-o"></i></div>' +
          '<div class="action" ng-click="zoomin()"><i class="fa fa-plus"></i></div>' +
          '<div class="action" ng-click="zoomout()"><i class="fa fa-minus"></i></div>' +
        '</div>',
      scope:{
        graph: '=',
        controller: '=',
        redirect: '&',
        toggleMenu: '&togglemenu'
      },
      link : function(scope, element, attrs) {
        // Creating sigma instance
        var timeout,
            
            IS_RUNNING     = 'RUNNING',
            IS_STOPPED     = 'STOPPED',
        
            layoutDuration    = 10000, // 10 sec default
            minlayoutDuration = 4500,
            maxlayoutDuration = 25000, 
            
            si = new sigma({
              settings: {
                singleHover: true,
                labelThreshold: 4.9
              }
            }),
            camera = si.addCamera('main'),
            
            colors = {
              'person': '#333',
              'collection': '#16cc00',
              'resource': '#cc1600',
              'resourceKnown': '#cc1600'
            };
        
        // set theinitial status
        scope.status = IS_STOPPED;
        
        // create the main camera and specify 'canvas'
        si.addRenderer({
          type: 'canvas',
          camera: 'main',
          container: element.find('#playground')[0]
        });
        
        /*
          
          Scope watchers
          ---
        
        */
        /*
          Watch: current controller
          if the current controller needs a bit more horizontal space,
          sigma instance needs to refresh to adapt to its parent new size;
          (that is, the class 'extended' ahs been added to the element)
        */
        scope.$watch('controller', function (ctrl) {
          $log.info('::sigma @controller changed');
          setTimeout(function() {
            si.refresh();
          }, 320);
        });
        
        /*
          Watch: current graph
          Redraw the current graph, calculate the force layout min duration
        */
        scope.$watch('graph', function (graph, previousGraph) {
          $log.info('::sigma @graph changed');
          if(!graph || !graph.nodes)
            return;
          stop();
          // calculate differences in x,y for the previous graph, if any
          if(previousGraph) {
            $log.info('::sigma --> reposition previous nodes', graph, previousGraph)
            
            var nodesMap = {};
            // map current graph
            graph.nodes.filter(function (d, i) {
              nodesMap[d.id] = i;
            });
                
            previousGraph.nodes.filter(function (d) {
              if(nodesMap[d.id]) { // was already present
                graph.nodes[nodesMap[d.id]].x = d.x;
                graph.nodes[nodesMap[d.id]].y = d.y;
              }
            }); 
          }
          
          // $log.info('::sigma --> brand new nodes', graph.nodes.map(function(d) {
          //   return d.id
          // }))
          
          // Reading new graph
          si.graph.clear().read(graph);
          // calculate a default duration 
          layoutDuration = Math.max(Math.min(4* si.graph.nodes().length * si.graph.edges().length, maxlayoutDuration),minlayoutDuration)
          $log.info('::sigma n. nodes', si.graph.nodes().length, ' n. edges', si.graph.edges().length, 'runninn layout atlas for', layoutDuration/1000, 'seconds')
          
          
          
          
          
          // computating other values for nodes (not only degree), min and max values
          // var stats = si.graph.HITS(true),
          //     authority = {min: -Infinity, max: Infinity};
          
          // $log.info('::sigma authority', authority)
          // local Degree for size
          si.graph.nodes().forEach(function(n) {
            // if(authority.max > 0)
            //   n.size = 1 + (stats[n.id].authority/(authority.max-authority.min))*6
            // else
            n.color = colors[n.type] || "#353535"
            n.size = n.type == 'res'? 1 : si.graph.degree(n.id) + 1.5;
          });
          if(!previousGraph)
            rescale();
          si.refresh();
          $log.info('::sigma force atlas started')
          play()
          
          
        });
        
         /*
        
          Software takes command ...
          ---
        
        */
        scope.togglePlay = function() {
          $log.info('::sigma -> togglePlay', scope.status);
          if(scope.status == IS_RUNNING) {
            stop();
          } else {
            play();
          }
        }
        
        /*
        
          DOM liteners
          ---
        
        */
        /*
          DOM click [data-id]
          check for focus changes
        */
        $(document).on('click', '[data-id]', function(e){
          var id = $(this).attr('data-id');
          focus(id);
        });
        /*
          sigma clickNode
          @todo
        */
        si.bind('clickNode', function(e){
          stop();
          
          $log.info('::sigma @clickNode', e.data.node.id, e.data.node.type || 'entity', e.data.node.label);
          if(e.data.node.type == 'resource') {
            $log.info('::sigma redirect to', '/r/' + e.data.node.id);
            //scope.redirect({path: '/r/' + e.data.node.id})
          }  
          switch(e.data.node.type) {
            case 'person':
            case 'personKnown':
              scope.toggleMenu({e: e.data.captor, item:null, tag:e.data.node, hashtag:'person' })
              $log.info('::sigma entity', e.data.captor);
              break;
            case 'resource':
            case 'resourceKnown':
              $log.info('::sigma resource');
              break;  
          }
          scope.$apply();
        });
        
        si.bind('overNode', function(e) {
          //console.log('overNode', e.data, e)
        })
        
        si.bind('clickStage', function(e) {
          scope.toggleMenu({});
          scope.$apply();
        })
        
        /*
        
          canvas / sigma js helpers
          ---
        
        */
        /*
          sigma focus
          Center the camera on focusId and enlighten the
          node
        */
        function focus(nodeId) {
          var node = si.graph.nodes(nodeId);
          
          sigma.misc.animation.camera(
            si.cameras.main,
            {
              x: node['read_cammain:x'],
              y: node['read_cammain:y'],
              ratio: 0.5
            },
            {duration: 150}
          );
        }
        /*
          sigma rescale
          start the force atlas layout
        */
        // once the container has benn added, add the commands. Rescale functions, with easing.
        function rescale() {
          sigma.misc.animation.camera(
            si.cameras.main,
            {x: 0, y: 0, angle: 0, ratio: 1.618},
            {duration: 150}
          );
        };
        /*
          sigma play
          start the force atlas layout
        */
        function play() {
          clearTimeout(timeout);
          timeout = setTimeout(function() {
            stop();
            scope.$apply();
          }, layoutDuration);
          
          scope.status = IS_RUNNING;
          
          si.startForceAtlas2({});
          $log.debug('::sigma -> play()')
        }
        /*
          sigma stop
          stop the force atlas layout
        */
        function stop() {
          clearTimeout(timeout);
          scope.status = IS_STOPPED;
          
          si.killForceAtlas2();
          $log.debug('::sigma -> stop()')
        }
        function zoomin() {
          sigma.misc.animation.camera(
            camera,
            {ratio: camera.ratio / 1.5},
            {duration: 150}
          );
        };
        function zoomout() {
          sigma.misc.animation.camera(
            camera,
            {ratio: camera.ratio * 1.5},
            {duration: 150}
          );
        };
        scope.rescale  = rescale; 
        scope.zoomin  = zoomin; 
        scope.zoomout = zoomout;
        /*
          sigma canvas drawNode
          given a canvas ctx, a node and sigma settings, draw the basic shape for a node.
        */
        function drawNode(node, context, settings, options) {
          var prefix = settings('prefix') || '';
          
          context.fillStyle = '#e8e8e8';
          context.beginPath();
          context.arc(
            node[prefix + 'x'],
            node[prefix + 'y'],
            node[prefix + 'size'] + 3,
            0,
            Math.PI * 2,
            true
          );
          
          context.fill();
          context.closePath();
          
          // adding the small point
          context.fillStyle = node.color;
          context.beginPath();
          context.arc(
            node[prefix + 'x'],
            node[prefix + 'y'],
            node[prefix + 'size'],
            0,
            Math.PI * 2,
            true
          );
          context.fill();
          context.closePath();
        };
        
        /*
        
          Sigma type specific Renderers
          ---
        */
        sigma.canvas.nodes.resource = function(node, context, settings) {
          drawNode(node, context, settings)
        };
        
        sigma.canvas.nodes.personKnown = 
        sigma.canvas.nodes.resourceKnown = function(node, context, settings) {
          var prefix = settings('prefix') || '';
          drawNode(node, context, settings);
          // Adding a border
          
          context.beginPath();
          context.arc(
            node[prefix + 'x'],
            node[prefix + 'y'],
            node[prefix + 'size'] + 5,
            0,
            Math.PI * 2,
            true
          );

          context.closePath();
            
          context.lineWidth = node.borderWidth || 1;
          context.strokeStyle = node.borderColor || '#444';
          context.stroke();
        };
      }
    }
  });
