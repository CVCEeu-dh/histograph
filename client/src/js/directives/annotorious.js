'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
angular.module('histograph')
  .directive('annotorious', function() {
    return {
      restrict : 'A',
      scope: {
        width: '=w',
        height: '=h',
        version: '=', // which annotation version do you want to see here?
        tiles : '=', // has it openlayers tiles?
        contribute: '&', // open contribution dialogue
        item: '='
      },
      link : function(scope, element) {
        // Add the plugin like so
        anno.addPlugin('AnnotoriousBridge', {
          onEditorShown: function(annotation){
            console.log(annotation)
            
            scope.contribute({
              item: scope.item, 
              type: "entity", 
              options: {
              }
            });
            scope.$apply();
          }
        });
        /* draw the current annotation version */
        var src = '';
        /*
          draw the corresponding annotation to annotorious
        */
        var draw = function (ver) {
          anno.removeAll();
          console.log('drqw version', ver, src)
          for(var i in ver.yaml) {
            // trznsform pixel to %
            var geometry = {
              x: ver.yaml[i].region.left/(+scope.width),
              y: ver.yaml[i].region.top/(+scope.height),
              
              width: 0.1,
              height: 0.1,
            };
            geometry.width = -geometry.x + ver.yaml[i].region.right/(+scope.width);
            geometry.height = -geometry.y + ver.yaml[i].region.bottom/(+scope.height);
            // console.log(geometry, ver.yaml[i].identification, src)
            anno.addAnnotation({
              src: src,
              text : ver.yaml[i].identification || '',
              shapes : [{
                type : 'rect',
                geometry : geometry
              }]
            })
          }

          if(ver.service == 'merged') {
            try {
              anno.addPlugin('Merge', {src: src});
            } catch(e){
              console.log(e)
            }
          }
        };

        

        scope.$watch('version', function (ver) {
          console.log('::annotorious @version', ver, 'has tiles?', scope.tiles)
          if(!ver)
            return;
          console.log('versio', element)
          if(!element[0].complete) {
            src = element[0].src;
            element.bind("load" , function (e) { 
              anno.makeAnnotatable(this);
              draw(ver);
            });
          } else {
            src = element[0].src;
            anno.makeAnnotatable(element[0]);
            draw(ver)
          };
        });
      }
    };
  })
  
  /*
    Test annotator
    cfr.
    based on https://github.com/withanage/angularjs-image-annotate/blob/master/src/imageAnnotate.js
  */
  .directive('annota', function () {

    

    return {
      restrict : 'A', // only element name in order to avoid errors
      scope: {
        src: '=',
        contribute: '&',
        item: '=',
        notes: '='
      },
      template: '<div style="position:relative; "></div>',
      link: function(scope, element, attrs) {

        // start everything once the loading has been done
        var img = new Image(),

            ele = d3.select(element[0]),

            svg,

            annotations = [],

            mouseIsDown = false,
            cursor = null, // current drawing position
            anchor = null; // first drawing position when user mousedown

        /*
          Enable mouse listeners
        */
        function start() {
          svg.on("mousemove", function() { 
              if(!mouseIsDown)
                return;
              var cursor = d3.mouse(this);
              annotate(cursor); 
            })
            .on('mouseup', function() {
              mouseIsDown = false;
              anchor=null;
              var w = parseInt(note.attr('width')),
                  h = parseInt(note.attr('height'));

              if((isNaN(w) || isNaN(h)) || (w < 20 || h < 20)) {
                console.log('width or height not valid')
                return
              }
              // froze annotation till the process is either submitted or discarded
              var region = translateToRegion({
                    x: parseInt(note.attr('x')),
                    y: parseInt(note.attr('y')),
                    width: parseInt(note.attr('width')),
                    height: parseInt(note.attr('height')),
                  });

              scope.contribute({
                item: scope.item,
                type: 'person',
                options: {
                  query: '',
                  context: 'picture',
                  ranges: [region],
                  quote: '', 
                  discard: function(){
                    note.attr({
                      width: 0,
                      height: 0
                    })
                  },
                  submit: function(){
                    
                    note.attr({
                      width: 0,
                      height: 0
                    })
                  }
                }
              });
              scope.$apply();
            })
            .on('mousedown', function() {
              mouseIsDown = true;
            });
        };

        function resize(w, h) {
          scope.width = w;
          scope.height = h;
          scope.$apply();
          if(svg)
            svg
              .attr('height', h)
              .attr('width', w);
        };

        /*
          Draw the rectangle by following the mouse position
        */
        function annotate(mouse) {
          var mod = {},
              cursor = {
                x: mouse[0],
                y: mouse[1]
              };
          if(!anchor) {
            anchor = cursor;
            mod = {
              x: cursor.x,
              y: cursor.y
            };
          }

          mod.width = cursor.x - anchor.x;
          mod.height = cursor.y - anchor.y;

          if(mod.width<0) {
            mod.x = anchor.x + mod.width;
            anchor.x = mod.x;
            mod.width = -1*mod.width;
          }
          if(mod.height<0) {
            mod.y = anchor.y + mod.height;
            anchor.y = mod.y;
            mod.height = -1*mod.height;
          }
          note.attr(mod)
        };

        /*
          Ops.. these functions should be replaced by d3.scale linear ;)
        */
        function translateToRegion(bounds){
          var coeff = {
            x: scope.realWidth/scope.width,
            y: scope.realHeight/scope.height,
          };
          
          return {
            left: bounds.x * coeff.x,
            top: bounds.y * coeff.y,
            right: (bounds.x + bounds.width) * coeff.x,
            bottom: (bounds.y + bounds.height) * coeff.y
          }
        };

        function translateFromRegion(region){
          var coeff = {
            x: scope.realWidth/scope.width,
            y: scope.realHeight/scope.height,
          };
          console.log('translateFromRegion', region, 'w', scope.width, scope.height)
          return {
            x: parseInt(region.left) / coeff.x,
            y: parseInt(region.top) / coeff.y,
            width: ( parseInt(region.right) -  parseInt(region.left)) / coeff.x,
            height: ( parseInt(region.bottom) -  parseInt(region.top)) / coeff.y
          }
        };

        /* 
          load only babe. (eventually add)
        */
        function loadAnnotations() {
          if(!scope.notes || !scope.notes.length)
            return;
          console.log(scope.notes)
          // draw freely
          // scope.notes
          var selection = svg.selectAll('.note')
            .data(scope.notes.map(function(d) {
              d.bounds = translateFromRegion(d.region);
              return d;
            }), function (d, i) {
              return i
            });

          var newbies = selection.enter()
            .append('g')
              .attr('class', function(d) {
                return ['note', (d.performed_by? 'manual': '')].join(' ')
              })
              

          newbies
            .append('rect')
              .attr('class', 'note-shadow')

          newbies
            .append('rect')
              .attr('class', 'note-borders')
          // update
          selection.selectAll('.note-borders').attr({
            'stroke-width': 1,
            'fill': 'rgba(255,255,255,0)',
            x: function(d) {
              return d.bounds.x
            },
            y: function(d) {
              return d.bounds.y
            },
            width: function(d) {
              return d.bounds.width
            },
            height: function(d) {
              return d.bounds.height
            }

          })
            .attr('data-id', function(d) {
              return d.id
            })
            .attr('gasp-type', 'person')
            .attr('gasp-parent', [scope.item.type, scope.item.id].join('-'))
            .attr('gasp-removable', function(d) {
              return d.removable
            })
            .attr('gasp-creator', function(d) {
              return d.performed_by? d.performed_by.username: null
            })
            

          selection.selectAll('.note-shadow').attr({
            'stroke-width': 1,
            stroke: 'black',
            x: function(d) {
              return d.bounds.x - 1
            },
            y: function(d) {
              return d.bounds.y - 1
            },
            width: function(d) {
              return d.bounds.width + 2
            },
            height: function(d) {
              return d.bounds.height + 2
            }

          })
        };

        /*
          Initialize
        */

        element.append(img);

        svg = ele.append('svg')
          .attr('height', 10)
          .attr('width', 10)
          .style({
            'position': 'absolute',
            left: 0
          })
          .style('stroke','rgba(124,240,10,1)')
          .style('fill','none')
        
        // init drag behaviour
        var drag = d3.behavior.drag().on("drag", function (d,i) {
            d.x += d3.event.dx
            d.y += d3.event.dy
            d3.select(this).attr("transform", function(d,i){
              return "translate(" + [ d.x,d.y ] + ")"
            })
        });

        var note = svg.append("rect")
          .data([ {
            x:0, 
            y:0
          }])
          .attr('class', 'cursor')
          



        // var selection = svg.append("rect")
        //     .data([ {"x":0, "y":0} ])
        //     .attr({
        //       height: 50,
        //       width: 100,
        //       fill: 'rgba(124,240,10,0.5)'
        //     }).call(drag);
        
        scope.$watch('notes', function(n) {
          if(n && scope.ready)
            loadAnnotations();
        }, true)

        img.addEventListener( 'load', function(e){
          console.log(e)
          element.css({
            'position':'relative',
            width: e.target.offsetWidth,
            margin: '0px auto'
          })
          scope.realHeight = this.naturalHeight;
          scope.realWidth = this.naturalWidth;
          scope.ready = true;
          resize(e.target.offsetWidth, e.target.offsetHeight);
          start();
          loadAnnotations();
        });
        img.addEventListener( 'error', this );
        img.src = attrs.prefix + scope.src;

        

      }
    }
    
  })
    

