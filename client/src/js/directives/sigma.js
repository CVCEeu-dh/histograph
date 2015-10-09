/*
  Sigma addons
  ---
  thanks to @jacomyal (it need to be added before creating any new instance of sigmajs)
*/
sigma.classes.graph.addMethod('neighbors', function (nodeId) {
  'use strict';

  var k,
      neighbors = {},
      index     = {};
  
  if(typeof nodeId == 'object')
    for(var i in nodeId)
      index = _.assign(index, this.allNeighborsIndex[nodeId[i]]);
  else
    index = this.allNeighborsIndex[nodeId] || {};
  
  for (k in index)
    neighbors[k] = this.nodesIndex[k];
  neighbors[nodeId] = this.nodesIndex[nodeId];
  return neighbors;
});
        
/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * directive to show a grapgh of nodes and edges thanks to @Yomguithereal!!! 
 */
angular.module('histograph')
  .directive('sigma', function ($log, $location) {
    'use strict';

    return {
      restrict : 'A',
      template: ''+
        '<div id="playground"></div>' +
        '<div gmasp target="target"></div>' +
        '<div id="tips" ng-if="tips.length > 0"><div>{{tips}}</div></div>' +
        '<div id="commands" class="{{lookup?\'lookup\':\'\'}}">' +
          '<div tooltip="view all nodes" tooltip-append-to-body="true" class="action {{lookup? \'bounceIn animated\': \'hidden\'}}" ng-click="toggleLookup()"><i class="fa fa-eye"></i></div>' +
          '<div class="action {{status==\'RUNNING\'? \'bounceIn animated\': \'\'}}" ng-click="togglePlay()"><i class="fa fa-{{status==\'RUNNING\' ? \'stop\': \'play\'}}"></i></div>' +
          '<div class="action" ng-click="rescale()"><i class="fa fa-dot-circle-o"></i></div>' +
          '<div class="action" ng-click="zoomin()"><i class="fa fa-plus"></i></div>' +
          '<div class="action" ng-click="zoomout()"><i class="fa fa-minus"></i></div>' +
        '</div>',
        
      scope:{
        graph: '=',
        tips: '=',
        freeze: '=',
        controller: '=',
        redirect: '&',
        addToQueue: '&queue',
        toggleMenu: '&togglemenu'
      },
      link : function(scope, element, attrs) {
        // set the initial target
        scope.target = false;
        
        // cutat function for long labels
        var cutat = function (text, cutAt) {
          var t = text.substr(0, cutAt);
          //re-trim if we are in the middle of a word
          if(t.length > cutAt)
            t = t.substr(0, Math.min(t.length, t.lastIndexOf(' '))) + ' ...';
          return t
        }  
        // configure a default tooltip
        var tooltip = {};
        
        tooltip.tip         = $("#tooltip-sigma");
        tooltip.el          = tooltip.tip.find('.tooltip-inner');
        tooltip.isVisible   = false;
        tooltip.text        = '';
        
        // Creating sigma instance
        var timeout,
            
            IS_RUNNING     = 'RUNNING',
            IS_STOPPED     = 'STOPPED',
        
            layoutDuration    = 10000, // 10 sec default
            minlayoutDuration = 4500,
            maxlayoutDuration = 25000, 
            
            labels = {
              nodes: {},
              sorting: [], 
            }, // the collection of labels to be visualized one after the other (according to node position, from top to left)
            si = new sigma({
                settings: {
                  singleHover: true,
                  labelThreshold: 0,
                  labelSizeRatio: 3.5,
                  // labelSize: 'fixed',
                  defaultLabelSize: '12',
                  labelHoverShadowColor: '#a5a5a5',
                  labelHoverShadowBlur: 16,
                  labelSize: '',
                  minNodeSize: 3,
                  maxNodeSize: 6,
                  enableEdgeHovering : true,
                  minEdgeSize: 1,
                  maxEdgeSize: 2,
                  defaultEdgeHoverColor: '#000',
                  edgeHoverSizeRatio: 1,
                  edgeHoverExtremities: true
    
                }
              }),
            camera = si.addCamera('main'),
            
            colors = {
              person: "#4dc3ba", //rgba(33, 33, 33, 0.7)",
              collection: '#16cc00',
              location: '#0093a6',
              resource: '#f6941c',
              resourceKnown: '#f6941c'
            },
            
            timers = {
                play: 0
              },
            
            scale = d3.scale.linear()
              .domain([0,100])
              .range(['#d4d4d4', '#000000']);
        
        
        
        // set theinitial status
        scope.status = IS_STOPPED;
        scope.lookup = false;
        
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
          $log.log('::sigma @controller changed');
          setTimeout(function() {
            $log.log('::sigma @controller changed -> rescale()');
            rescale();
            si.refresh();
          }, 300);
        });
        
        scope.$watch('freeze', function (v) {
          if(v=='sigma')
            stop();
        });
        
        /*
          Watch: current graph
          Redraw the current graph, calculate the force layout min duration
        */
        scope.$watch('graph', function (graph, previousGraph) {
          clearTimeout(timers.play);
          $log.log('::sigma @graph changed');
          
          stop();
          
          scope.target = false;
          
          // clean graph if there are no nodes, then exit
          if(!graph || !graph.nodes || !graph.nodes.length) {
            $log.log('::sigma @graph empty, clear...');
            si.graph.clear();
            si.refresh();
            return;
          }
            
          // refresh the scale for edge color, calculated the extent weights of the edges
          scale.domain(d3.extent(graph.edges, function(d) {return d.weight || 1}));
          
          // Reading new graph
          si.graph.clear();
          si.refresh();
          // calculate initital layout duration 
          layoutDuration = Math.max(Math.min(4* si.graph.nodes().length * si.graph.edges().length, maxlayoutDuration),minlayoutDuration)
          $log.log('::sigma n. nodes', si.graph.nodes().length, ' n. edges', si.graph.edges().length, 'runninn layout atlas for', layoutDuration/1000, 'seconds')
          
          // timout the layout
          timers.play = setTimeout(function() {
            si.graph.clear().read(graph);
            si.graph.nodes().forEach(function (n) {
              n.color = n.type?
                (colors[n.type] || "#353535"):
                "#353535";
              n.x = n.x || Math.random()*50
              n.y = n.y || Math.random()*50
              n.size = Math.sqrt(si.graph.degree(n.id));
            });
            si.graph.edges().forEach(function (n) {
              
              n.size = n.weight;
            });
            
            if(graph.nodes.length > 50) {
              si.settings('labelThreshold', 5.5);
              si.settings('labelSize', 'fixed');
              $log.log('::sigma change settings, a lot of nodes')
            } else {
              
              si.settings('labelThreshold', 0);
              si.settings('labelSize', 'fixed');
            }
            rescale();
            si.refresh();
            play(); 
          }, 1000);
          
        });
        
         /*
        
          Software takes command ...
          ---
        
        */
        scope.togglePlay = function() {
          $log.log('::sigma -> togglePlay', scope.status);
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
        $(document).on('click', '[data-id]', focus);
        
        /*
          sigma clickNode
        */
        si.bind('clickNode', function (e){
          // stop the layout runner
          stop();
          // if(e.data.captor.isDragging) {
          //   $log.info('::sigma @clickNode isDragging');
          //   return;
          // }
          
          $log.log('::sigma @clickNode', e.data);
          
          // calculate the node do keep
          var toKeep = si.graph.neighbors(e.data.node.id);
           
          // enlighten the egonetwork
          si.graph.nodes().forEach(function (n) {
            n.discard = !toKeep[n.id];
          });
          si.graph.edges().forEach(function (e) {
            e.discard = !(toKeep[e.source] && toKeep[e.target])
          });
          
          scope.lookup = true;
          scope.target = {
            type: 'node',
            data: e.data
          };
          // apply the scope
          scope.$apply();
          // refresh the view
          si.refresh();
        });
        
        
        
        si.bind('overEdge', function(e) {
          // debugger
          // console.log(arguments)
          if(tooltip.timer)
            clearTimeout(tooltip.timer);
          
          var _css = {
                transform: 'translate('+ e.data.captor.clientX +'px,'+ e.data.captor.clientY +'px)'
              },
              label = [
                si.graph.nodes(''+e.data.edge.source).label,
                si.graph.nodes(''+e.data.edge.target).label
              ].join(' - ');
          
          tooltip.edge = e.data.edge.id;
          if(!tooltip.isVisible)
            _css.opacity = 1.0;
          
          if(tooltip.text != label)
            tooltip.el.text(label);
          
          tooltip.isVisible = true;
          tooltip.text = label
          // apply css transf
          tooltip.tip.css(_css);
          
        });
        /*
          listener overNode
          on mouseover, draw the related tooltip in the correct position.
          We use the renderer since the tooltip is relqtive to sigma parent element.
        */
        si.bind('overNode', function(e) {
          // console.log('overnode');
          // console.log(e.data.node, tooltip.el)
          if(tooltip.timer)
            clearTimeout(tooltip.timer);
          
          var _css = {
            transform: 'translate('+ e.data.captor.clientX +'px,'+ e.data.captor.clientY +'px)'
          };
          
          if(!tooltip.isVisible)
            _css.opacity = 1.0;
          
          if(tooltip.text != e.data.node.label)
            tooltip.el.text(e.data.node.label);
          
          tooltip.isVisible = true;
          tooltip.text = e.data.node.label
          
          // apply css transf
          tooltip.tip.css(_css);
        });

        /*
          listener outNode
        */
        si.bind('outEdge outNode', function(e) {
          
          // if(e.data.edge && (tooltip.node == e.data.edge.source || tooltip.node == e.data.edge.target )) {
          //   return; // i.e, the overnode is thrown before the corresponding outEdge event.
          // }
          // console.log('outEdge outNode')
          if(!tooltip.isVisible)
            return;
          if(tooltip.timer)
            clearTimeout(tooltip.timer);
          tooltip.timer = setTimeout(function() {
            tooltip.tip.css({
              opacity: 0
            });
          }, 210);
          
          tooltip.isVisible = false;
        })
        
        
        
        si.bind('clickEdge', function(e) {
          e.data.edge.nodes = {
            source: si.graph.nodes(''+e.data.edge.source),
            target: si.graph.nodes(''+e.data.edge.target)
          };
          var toKeep = si.graph.neighbors([''+e.data.edge.source, ''+e.data.edge.target]);
           
          // enlighten the egonetwork
          si.graph.nodes().forEach(function (n) {
            n.discard = !toKeep[n.id];
          });
          si.graph.edges().forEach(function (e) {
            e.discard = !(toKeep[e.source] && toKeep[e.target])
          });
          
          scope.target = {
            type: 'edge',
            data: e.data
          };
          scope.$apply();
          si.refresh();
        })
        
        si.bind('clickStage', function(e) {
          if(e.data.captor.isDragging === false)
            toggleLookup({
              update: true
            });
          $('body').trigger('sigma.clickStage');
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
         
          if(typeof nodeId == 'object') { // it is an event ideed
            nodeId = $(this).attr('data-id');
          }
           $log.info('::sigma --> focus()', nodeId, _.map(si.graph.nodes(), 'id'))
          var node = si.graph.nodes(nodeId);
          try{
            sigma.misc.animation.camera(
              si.cameras.main,
              {
                x: node['read_cammain:x'],
                y: node['read_cammain:y'],
                ratio: 0.5
              },
              {duration: 250}
            );
          } catch(e) {
            $log.error(e)
          }
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
          sigma reset neighbors
          from egonetwork to other stories
        */
        function toggleLookup(options) {
          $log.debug('::sigma -> toggleLookup()')
          si.graph.nodes().forEach(function (n) {
            n.discard = false;
          });
          si.graph.edges().forEach(function (e) {
            e.discard = false
          });
          scope.lookup = false;
          scope.target = false;
          tooltip.node = false;
          // refresh the view
          // rescale()
          si.refresh();
          if(options && options.update)
            scope.$apply();
        }
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
          
          si.startForceAtlas2({
            adjustSizes :true,
            linLogMode: true,
            startingIterations : 10,
            gravity : 1,
            edgeWeightInfluence : 1
          });
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
        scope.rescale      = rescale; 
        scope.zoomin       = zoomin; 
        scope.zoomout      = zoomout;
        scope.toggleLookup = toggleLookup;
        /*
          sigma canvas drawNode
          given a canvas ctx, a node and sigma settings, draw the basic shape for a node.
        */
        function drawNode(node, context, settings, options) {
          var prefix = settings('prefix') || '';
          
          if(scope.target.type=='node' && scope.target.data.node.id == node.id) {
            context.fillStyle = '#383838';
            context.beginPath();
            context.arc(
              node[prefix + 'x'],
              node[prefix + 'y'],
              node[prefix + 'size'] + 4,
              0,
              Math.PI * 2,
              true
            );
            
            context.fill();
            context.closePath(); 
              
          }
          context.fillStyle = node.discard? "rgba(0,0,0, .11)": node.color;
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
        sigma.canvas.nodes.personKnown = 
        sigma.canvas.nodes.resourceKnown =
        sigma.canvas.nodes.resource =
        sigma.canvas.nodes.person = function(node, context, settings) {
          drawNode(node, context, settings)
        };
        
        /*
          sigma canvas edge renderer
          
        */
        sigma.canvas.edges.def = function(edge, source, target, context, settings) {
          var color = "#d4d4d4",
              prefix = settings('prefix') || '';
         
          if(scope.target && scope.target.type=='edge' && scope.target.data.edge.id == edge.id) {
            context.strokeStyle = '#383838';
            context.lineWidth = 6;
            context.beginPath();
            context.moveTo(
              source[prefix + 'x'],
              source[prefix + 'y']
            );
            context.lineTo(
              target[prefix + 'x'],
              target[prefix + 'y']
            );
            context.stroke();
          } else {
          
          context.strokeStyle = edge.discard? '#e8E8E8' : scale(edge.weight||1)//color;
          context.lineWidth = edge.discard? 1: 2;//edge[prefix + 'weight'] || edge.weight || 1;
          context.beginPath();
          context.moveTo(
            source[prefix + 'x'],
            source[prefix + 'y']
          );
          context.lineTo(
            target[prefix + 'x'],
            target[prefix + 'y']
          );
          context.stroke();
          }
        };
        
        sigma.canvas.edgehovers.def = function(edge, source, target, context, settings) {
          if(!edge || !source || !target)
            return;
          var color = colors[source.type],
            prefix = settings('prefix') || '',
            size = edge[prefix + 'size'] || 1;
            
          size *= settings('edgeHoverSizeRatio');

          context.strokeStyle = color;
          context.lineWidth = size;
          context.beginPath();
          context.moveTo(
            source[prefix + 'x'],
            source[prefix + 'y']
          );
          context.lineTo(
            target[prefix + 'x'],
            target[prefix + 'y']
          );
          context.stroke();
        };
        
        sigma.canvas.extremities.def = function(edge, source, target, context, settings) {
          if(!edge || !source || !target)
            return;
          // Source Node:
          (
            sigma.canvas.hovers[source.type] ||
            sigma.canvas.hovers.def
          ) (
            source, context, settings
          );

          // Target Node:
          (
            sigma.canvas.hovers[target.type] ||
            sigma.canvas.hovers.def
          ) (
            target, context, settings
          );
        };
         // sigma.canvas.edgeshover.def = function() {}
        
        /*
          sigma canvas labels renderer
          
        */
        sigma.canvas.labels.def = function(node, context, settings) {
          var fontSize,
              prefix = settings('prefix') || '',
              size = node[prefix + 'size'];
          
          if(node.discard)
            return;
          
          if (size < settings('labelThreshold'))
            return;

          if (!node.label || typeof node.label !== 'string')
            return;
          
          if(node['renderer1:x'] < 0 || node['renderer1:y'] < 0)
            return;
          
          // if(node.label == 'Jacques Delors')console.log('visiblelag', node['renderer1:x'], node['renderer1:y'])
          fontSize = (settings('labelSize') === 'fixed') ?
            settings('defaultLabelSize') :
            settings('labelSizeRatio') * size;

          context.font = (settings('fontStyle') ? settings('fontStyle') + ' ' : '') +
            fontSize + 'px ' + settings('font');
          context.fillStyle = (settings('labelColor') === 'node') ?
            (node.color || settings('defaultNodeColor')) :
            settings('defaultLabelColor');

          context.fillText(
            node.label,
            Math.round(node[prefix + 'x'] + size + 3),
            Math.round(node[prefix + 'y'] + fontSize / 3)
          );
        };
        
        /*
          sigma canvas labels HOVER renderer
          
        */
        sigma.canvas.hovers.def = function(node, context, settings) {
          var prefix = settings('prefix') || '';
          
          // context.fillStyle = node.discard? "rgba(0,0,0, .21)": "rgba(255,255,255, .81)";
        
          // context.beginPath();
          // context.arc(
          //   node[prefix + 'x'],
          //   node[prefix + 'y'],
          //   node[prefix + 'size']+3,
          //   0,
          //   Math.PI * 2,
          //   true
          // );
          
          // context.fill();
          // context.closePath();
          
          if( node[prefix + 'size']) {
            context.fillStyle = "#151515";
            context.beginPath();
            context.arc(
              node[prefix + 'x'],
              node[prefix + 'y'],
              3,
              0,
              Math.PI * 2,
              true
            );
            context.fill();
            context.closePath();
          }
        };
        
        /*
          sigma canvas svg
          
        */
        // sigma.svg.hovers.def = function() {}
      }
    }
  });
