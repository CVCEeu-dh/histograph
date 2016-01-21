
/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * directive to show a grapgh of nodes and edges thanks to @Yomguithereal!!! 
 */
angular.module('histograph')

  .directive('sigma', function ($log, $location, $timeout, EVENTS) {
    'use strict';

    return {
      restrict : 'A',
      templateUrl: 'templates/partials/helpers/sigma.html',
        
      scope:{
        graph: '=',
        tips: '=',
        controller: '=',
        redirect: '&',
        addToQueue: '&queue',
        addFilter: '&filter',
        toggleMenu: '&togglemenu',
        setMessage:  '&setmessage',
      },
      link : function(scope, element, attrs) {
        // cutat function for long labels
        var cutat = function (text, cutAt) {
          var t = text.substr(0, cutAt);
          //re-trim if we are in the middle of a word
          if(text.length > cutAt)
            t = t.substr(0, Math.min(t.length, t.lastIndexOf(' '))) + ' ...';
          return t
        }  
        // configure a default tooltip
        var tooltip = {};
        
        tooltip.tip         = $("#tooltip-sigma");
        tooltip.el          = tooltip.tip.find('.tooltip-inner');
        tooltip.isVisible   = false;
        tooltip.text        = '';
        
        // configure default tooltip for edges
        tooltip.edge = {};
        tooltip.edge.tip         = $("#tooltip-sigma-edge");
        tooltip.edge.el          = tooltip.edge.tip.find('.tooltip-inner');
        tooltip.edge.isVisible   = false;
        tooltip.edge.text        = '';
        
        /*
          Sigma messenger
        */
        scope.message = {
          text: '',
          visible: false
        };

        scope.showMessage = function(text) {
          if(scope.message.timer)
            $timeout.cancel(scope.message.timer);
          scope.message.timer = $timeout(scope.hideMessage, 1800);
          scope.message.text = text;
          scope.message.visible = true;
        }


        scope.hideMessage = function(text) {
          scope.message.visible = false
        }
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
        
        /*
          Build slopwly but surely the graph
          Calculate the differences between pg and g: nodes to delete, nodes to add. 
          usage
        */
        sigma.classes.graph.addMethod('build', function (g, pg) {
          'use strict';
          var self = this;
          
          
          // add pair of nodes ...
          var i,
              a,
              b,
              c,
              ns,
              an,
              l,
              k,
              nt,
              c,
              n1,
              n2;
          
          // calculate differences in nodeset
          
          
          // the overall node indexes
          ns = _.indexBy(g.nodes, 'id');
          an = {};
          // console.log('rererererere', ns,g.nodes)
          a = g.edges || [];
          c = a.length;
          var addn = function(n, id) {
            n.color = n.type?
              (colors[n.type] || "#353535"):
              "#353535";
            n.x = n.x || Math.random()*50;
            n.y = n.y || Math.random()*50;
            if(g.centers && g.centers.indexOf(n.id) !== -1) {
              n.center = true;
            }
            n.size = 5;//Math.sqrt(si.graph.degree(n.id));
            self.addNode(n);
          }

          function addNextNode(){
            si.killForceAtlas2();
            // console.log('add', c)
            c--;



            if(!an[a[c].source]) {
              n1 = ns[a[c].source];
              addn(n1);
            } else {
              self.nodes([n1.id]).size +=1
            }
            if(!an[a[c].target]) {
              n2 = ns[a[c].target];
              addn(n2);
            } else {
              self.nodes([n2.id]).size +=1
            }


            an[a[c].source] = true;
            an[a[c].target] = true;
            
            self.addEdge(a[c]);
            si.refresh();
            si.startForceAtlas2({
              adjustSizes :true,
              linLogMode: true,
              startingIterations : 0,
              gravity : 1,
              edgeWeightInfluence : 1,
              slowDown: 100,
            });
            if(c > 0 && a[c])
              nt = setTimeout(addNextNode, 20);
          }

          nt = setTimeout(addNextNode, 20);
          return this;
        });
        
        
        
        
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
              person: d3.scale.sqrt().range(['#94d9f8', '#1a75bb']),
              location: d3.scale.sqrt().range(['#e16666', '#7e213c']),
              place: d3.scale.sqrt().range(['#7de366', '#3ba220']),
              theme: d3.scale.sqrt().range(['#ffe46d','#ff9b01']),
              hashtag: d3.scale.sqrt().range(['#ffe46d','#ff9b01']),
              resource: d3.scale.sqrt().range(['#f6941c', '#f6941c']),
              resourceKnown: d3.scale.sqrt().range(['#f6941c', '#f6941c']),
            },
            
            timers = {
                play: 0
              },
            
            scale = d3.scale.sqrt()
              .domain([0,100])
              .range(['#d4d4d4', '#000000']);
        
        
        
        // set the initial target
        scope.target = false;
        scope.status = IS_STOPPED;
        scope.lookup = false;
        
        // create the main camera and specify 'canvas'
        si.addRenderer({
          type: 'canvas',
          camera: 'main',
          container: element.find('#playground')[0]
        });
        
        /*
          Initialize plugins
          ---
        */
        var dragListener = sigma.plugins.dragNodes(si, si.renderers[0]);
        
        
        
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

          if(tooltip.edge.timer)
            clearTimeout(tooltip.edge.timer);
          
          tooltip.edge.tip.css({
            opacity: 0
          });
          
          tooltip.edge.isVisible = false;
          
          
          if(tooltip.timer)
            clearTimeout(tooltip.timer);

          tooltip.isVisible = false;
          tooltip.tip.css({
            opacity: 0
          });

          setTimeout(function() {
            rescale();
            si.refresh();
          }, 300);
        });
        /*
          watch current target.
        */
        scope.$watch('target', function(t) {
          
        })
        
        scope.$on(EVENTS.LOCATION_CHANGE_START, function (v) {
          stop();
          $log.log('::sigma @EVENTS.LOCATION_CHANGE_START');
          scope.setMessage({message: 'loading ...'});
        });

        // scope.$on(EVENTS.API_PARAMS_CHANGED, function (v, stateName) {
        //   if(stateName.indexOf('graph') != -1)
        //   $log.log('::sigma @EVENTS.API_PARAMS_CHANGED');
        //   scope.setMessage({message: 'loading graph ...'});
        // });

        scope.$on(EVENTS.STATE_CHANGE_SUCCESS, function (e, stateName) {
          $log.log('::sigma @EVENTS.STATE_CHANGE_SUCCESS', stateName);
          scope.center = null;
          if(stateName.indexOf('graph') != -1)
            scope.setMessage({message: 'loading graph ...'});
        });
        
        scope.$on(EVENTS.SIGMA_SET_ITEM, function (e, item) {
          $log.log('::sigma @EVENTS.SIGMA_SET_ITEM', item);
          scope.center = item;
          scope.target = {
            type: 'node',
            data: {
              node: item
            }
          };
          
        });
        
        /*
          Watch: current graph
          Redraw the current graph, calculate the force layout min duration
        */
        scope.$watch('graph', function (graph, previousGraph) {
          clearTimeout(timers.play);
          
          
          stop();
          if(!graph && !previousGraph) {
            // first instantiation
            return;
          }
          $log.log('::sigma @graph changed');
          // clean graph if there are no nodes, then exit
          if(!graph || !graph.nodes || !graph.nodes.length) {
            $log.log('::sigma @graph empty, clear...', graph);
            scope.setMessage({message: 'there are no connected elements'});
            si.graph.clear();
            si.refresh();
            return;
          }
          // calculate initital layout duration 
          layoutDuration = Math.max(Math.min(4* graph.nodes.length * graph.edges.length, maxlayoutDuration),minlayoutDuration)
          $log.log('::sigma n. nodes', si.graph.nodes.length, ' n. edges', si.graph.edges.length, 'runninn layout atlas for', layoutDuration/1000, 'seconds')
          
          // refresh the scale for edge color, calculated the extent weights of the edges
          scale.domain(d3.extent(graph.edges, function(d) {return d.weight || 1}));
          
          // refresh the colors domain according to the type, per each group
          _.forEach(_.groupBy(graph.nodes, 'type'), function (group, type) {
            console.log(arguments)
            colors[type].domain(d3.extent(group, function(d) { return d.importance || 1}));
          });
                    
          // play();
          // si.graph.build(graph)
          // return;

          // timout the layout
          timers.play = setTimeout(function() {
            si.graph.clear();
          // si.refresh();
            // previous nodes
            var pns = previousGraph? _.indexBy(previousGraph.nodes, 'id'): {};
            // set size, and fixes what need to be fixed. If there are fixed nodes, the camera should center on it
            graph.nodes = graph.nodes.map(function (n) {
              if(pns[n.id]) {
                n = pns[n.id];
                n.center = false;
              } else {
                n.color = n.type? colors[n.type](n.importance): "#353535";
                n.x = n.x || Math.random()*50;
                n.y = n.y || Math.random()*50;
              }

              n.size = n.degree || 5;

              if(graph.centers && graph.centers.indexOf(n.id) !== -1) {
                n.center = true;
              }
              // n.size = 5;//Math.sqrt(si.graph.degree(n.id));
              return n;
            });
            // console.log(graph.nodes)
            graph.edges = graph.edges.map(function (n) {
              n.size = n.weight;
              return n
            });
            
            
            if(graph.nodes.length > 50) {
              si.settings('labelThreshold', 5.5);
              si.settings('labelSize', 'fixed');
              $log.log('::sigma change settings, a lot of nodes')
            } else {
              
              si.settings('labelThreshold', 0);
              si.settings('labelSize', 'fixed');
            }
            $log.log('::sigma @graph add', graph.edges.length, 'edges,', graph.nodes.length, 'nodes');
            si.graph.clear().read(graph);
            // si.graph.nodes().forEach(function (n) {
            //   n.size =si.graph.degree(n.id);
            // });
            
            
            
            // rescale();
            si.refresh();
            play(); 
          }, 100);
          scope.setMessage({message: false});
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
           $log.log('::sigma @clickNode');
          // stop the layout runner
          stop();

          // set the proper target for our gasp popup
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
          if(tooltip.edge.timer)
            clearTimeout(tooltip.edge.timer);
          
          var _css = {
                transform: 'translate('+ e.data.captor.clientX +'px,'+ e.data.captor.clientY +'px)'
              },
              label = [
                si.graph.nodes(''+e.data.edge.source).label,
                si.graph.nodes(''+e.data.edge.target).label
              ].join(' - ') + ' / ' + e.data.edge.weight + ' in common';
          
          tooltip.edge.edge = e.data.edge.id;
          if(!tooltip.edge.isVisible)
            _css.opacity = 1.0;
          // console.log(label)
          if(tooltip.edge.text != label)
            tooltip.edge.el.text(label);
          
          tooltip.edge.isVisible = true;
          tooltip.edge.text = label
          // apply css transf
          tooltip.edge.tip.css(_css);
          
        });
        /*
          listener overNode
          on mouseover, draw the related tooltip in the correct position.
          We use the renderer since the tooltip is relqtive to sigma parent element.
        */
        si.bind('overNode', function(e) {
          // remove tooltip edge
          if(tooltip.edge.timer)
            clearTimeout(tooltip.edge.timer);
          
          tooltip.edge.tip.css({
            opacity: 0
          });
          
          tooltip.edge.isVisible = false;
          
          
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

        var outNode = function(){
          if(!tooltip.isVisible)
            return;
          if(tooltip.timer)
            clearTimeout(tooltip.timer);
          tooltip.timer = setTimeout(function() {
            tooltip.tip.css({
              opacity: 0
            });
           tooltip.isVisible = false;
          }, 120)
        }
        
        var outEdge = function() {
          if(tooltip.edge.timer)
            clearTimeout(tooltip.edge.timer);
          
          tooltip.edge.tip.css({
            opacity: 0
          });
          
          tooltip.edge.isVisible = false;
        }
        /*
          listener outNode, outEdge
        */
        si.bind('outNode', outNode);
        si.bind('outEdge', outEdge);
       
        
        si.bind('clickEdge', function (e) {
          // enrich data with single nodes
          e.data.edge.nodes = {
            source: si.graph.nodes(''+e.data.edge.source),
            target: si.graph.nodes(''+e.data.edge.target)
          };
          
          
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
          // clear dummy tooltip
          outEdge();
          outNode();

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
          $log.info('::sigma --> focus()', nodeId);//, _.map(si.graph.nodes(), 'id'))
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
            scope.showMessage(node.label);

          } catch(e) {
            $log.error(e);
            scope.showMessage('not found');
          } finally {
            scope.$apply();
          }
        }

        /*
          Show the egonetwork of the current target
          @param nodes - a list of nodes
        */
        scope.egonetwork = function(nodes) {

          // calculate the node do keep
          var toKeep = si.graph.neighbors(nodes);
           
          // enlighten the egonetwork
          si.graph.nodes().forEach(function (n) {
            n.discard = !toKeep[n.id];
          });
          si.graph.edges().forEach(function (e) {
            e.discard = !(toKeep[e.source] && toKeep[e.target])
          });
          
          // refresh the view
          si.refresh();
        };
        /*
          sigma rescale
          start the force atlas layout
        */
        // once the container has benn added, add the commands. Rescale functions, with easing.
        function rescale() {
          $log.log('::sigma @controller -> rescale()');
          sigma.misc.animation.camera(
            si.cameras.main,
            {x: 0, y: 0, angle: 0, ratio: 1.0618},
            {duration: 550}
          );
        };
        
        /*
          sigma reset neighbors
          from egonetwork to other stories
        */
        function toggleLookup(options) {
          $log.debug('::sigma -> toggleLookup()')
          
          scope.lookup = false;
          scope.target = false;
          tooltip.node = false;
          
          if(options && options.update)
            scope.$apply();
          si.graph.nodes().forEach(function (n) {
            n.discard = false;
          });
          si.graph.edges().forEach(function (e) {
            e.discard = false
          });
          // refresh the view
          // rescale()
          si.refresh();
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
            linLogMode: false,
            startingIterations : 0,
            gravity : 0,
            slowDown: 10,
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
          if(scope.status == IS_RUNNING) {
            si.killForceAtlas2();
            $log.debug('::sigma -> stop()')
          } else {
            $log.debug('::sigma -> stop() skipping, it was stopped already')
          }
          scope.status = IS_STOPPED;
          
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

        function download() {
          si.toSVG({
            labels: true,
            classes: false,
            data: true,
            download: true,
            filename: 'histograph.svg'
          });
        };

        scope.rescale      = rescale;
        scope.download     = download;
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

          // draw a round all around
          if(node.ghost == 0 && !node.center) {
            context.fillStyle = "rgba(0,0,0, .11)";
            context.beginPath();
            context.arc(
              node[prefix + 'x'],
              node[prefix + 'y'],
              node[prefix + 'size'] + 12,
              0,
              Math.PI * 2,
              true
            );
            
            context.fill();
            context.closePath();
            
          }

          // draw the main node
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
          
          

          // draw a square: node is a central node
          if(node.center) {
            var l = node[prefix + 'size'] + 12;
            context.fillStyle = '#383838';
            context.rect(
              node[prefix + 'x'] - l/2,
              node[prefix + 'y'] - l/2,
              l,
              l
            );
             context.fill();
          }
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
          if(source.ghost == 1 || target.ghost == 1)
              context.strokeStyle = "rgba(0,0,0, .047)"
          
          else
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
          var color = '#151515',
            prefix = settings('prefix') || '',
            size = 5;
            
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
          if(node.center) {
            fontSize = settings('defaultLabelSize');
            context.font = (settings('fontStyle') ? settings('fontStyle') + ' ' : '') +
              fontSize + 'px ' + settings('font');
            context.fillStyle = settings('defaultLabelColor');
            context.fillText(
              cutat(node.label, 22),
              Math.round(node[prefix + 'x'] + size + 9),
              Math.round(node[prefix + 'y'] + fontSize / 3)
            );
            return;
          }
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
            cutat(node.label, 22),
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
  })
.directive('gmasp', function ($log, $location) {
    return {
      restrict : 'A',
      templateUrl: 'templates/partials/helpers/network-legend.html',
      scope:{
        target : '='
      },
      link : function(scope, element, attrs) {
        var _gasp = $(element[0]); // gasp instance;
        scope.enabled = false;
        $log.log('::gmasp ready');
        
        scope.addTargetToQueue = function() {
          $log.log('::gmasp -> addTargetToQueue()')
          if(scope.target.type == 'node')
            scope.$parent.addToQueue({
              items: [ scope.target.data.node.id ]
            });
          else if(scope.target.type == 'edge')
            scope.$parent.addToQueue({
              items: [
                scope.target.data.edge.nodes.source.id,
                scope.target.data.edge.nodes.target.id
              ]
            })
        }
        // add the current target id as the ID
        scope.addTargetToFilter = function() {
          $log.log('::gmasp -> addTargetToFilter()');
          if(scope.target.type == 'node')
            scope.$parent.addFilter({
              key: 'with',
              value: scope.target.data.node.id
            });
          else
            scope.$parent.addFilter({
              key: 'with',
              value: [scope.target.data.edge.nodes.source.id, scope.target.data.edge.nodes.target.id].join(',')
            });
        }
        
        /*
          display node or edge egonetwork

        */
        scope.egonetwork = function() {
          $log.log('::gmasp -> egonetwork()');
          
          var nodes = [];
          if(scope.target.type == 'node')
            nodes.push(scope.target.data.node.id)
          else
            nodes.push(
              scope.target.data.edge.nodes.source.id,
              scope.target.data.edge.nodes.target.id
            );
          scope.$parent.egonetwork(nodes);
        }

        /*
          Enable or disable GMASP according to scope.target nature.
        */
        scope.$watch('target', function(v) {
          $log.log('::gmasp @target - value:', v);
          if(!v || !v.type) {
            // make it NOT visible
            scope.enabled = false;
            return;
          }
          // handle label according to target type (node or edge)
          if(v.type=='node') {
            scope.href  = '#/' + (v.data.node.type=='resource'? 'r': 'e') + '/' + v.data.node.id;
            scope.label = v.data.node.label;
            scope.type = v.data.node.type;
            scope.filterby = 'filter by ' + v.data.node.label;
          } else if(v.type == 'edge') {
            scope.href   = false;
            scope.weight = v.data.edge.weight;
            scope.left   = v.data.edge.nodes.source;
            scope.right  = v.data.edge.nodes.target;
            scope.filterby = 'filter by ' + v.data.edge.nodes.source.label +', '+v.data.edge.nodes.target.label;
          }
          // make it visible
          scope.enabled = true;
          
        })
      }
    }
  })
