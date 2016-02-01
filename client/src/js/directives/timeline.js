/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * directive to show a grapgh of nodes and edges thanks to @Yomguithereal!!! 
 */
angular.module('histograph')
  .directive('timeline', function($log, $window,$location) {
    return {
      restrict : 'A',
      scope:{
        timeline: '=t',
        contextualTimeline: '=cxt',
        filters : '='
      },
      template: '<div class="brushdate left tk-proxima-nova"></div><div class="brushdate right tk-proxima-nova"></div><div class="date left tk-proxima-nova"></div><div class="date right tk-proxima-nova"></div><div class="mouse tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div><div class="viewer"></div>',
      link : function(scope, element, attrs) {
        'use strict';
        /*
          Timeline config
          ---
        */
        var tim = {
          css:{},
          fn:{
            asDay: d3.time.format("%B %d, %Y"),
            asMonth: d3.time.format("%Y-%m"),
            asYear: d3.time.format("%Y")
          },
          padding: {
            v: 10,
            h: 10  
          },
          dimensions: {
            w: 1000,
            h: 50  
          },
          _width: 0,
          _height: 50,
          ui: {}
        };
        
        // set/get timeline width
        tim.width = function(v) {
          if(!v)
            return tim._width;
          tim._width = v;
          return tim;    
        };
        
        tim.height = function(v) {
          if(!v)
            return tim._height;
          tim._height = v;
          return tim;    
        };
        
        tim.init = function() {
          $log.log('::timeline -> init() ');
          
          tim.ui.viewer            = d3.select('#timeline .viewer');
          tim.ui.tooltip           = d3.select('#timeline .tooltip');
          tim.ui.tooltipText       = d3.select('#timeline .tooltip-inner');
          tim.ui.dateLeft          = d3.select('#timeline .date.left');
          tim.ui.dateRight         = d3.select('#timeline .date.right');
          tim.ui.brushDateLeft     = d3.select('#timeline .brushdate.left');
          tim.ui.brushDateRight    = d3.select('#timeline .brushdate.right');
              
          tim.brush       = d3.svg.brush().x(tim.fn.x);
          
          tim.width(tim.ui.viewer[0][0].clientWidth);
          
          tim.svg = tim.ui.viewer
            .append('svg')
              .attr('height', tim.height())
              .attr('width', tim.width());
          
          tim.histograms = tim.svg.append('g')
            .attr('class', 'histograms')
            .attr('transform', 'translate('+ tim.padding.v +',' + tim.padding.h + ')')
          
          tim.stream  = tim.svg.append('path')
            .attr('transform', 'translate('+ tim.padding.v +',' + tim.padding.h + ')')
            .attr('class', 'stream')
          
          tim.ui.pointer = tim.svg.append("rect")
            .attr({
              height: tim.dimensions.h,
              width: 1,
              fill: 'magenta'
            })
            .style({
              opacity: 0
            });
            
          tim.context = tim.svg.append("g")
              .attr("class", "context")
              .attr("transform", "translate(" + tim.padding.v + "," + tim.padding.h/2 + ")");                
          
          tim.gBrush = tim.context.append("g")
              .attr("class", "x brush")
              .call(tim.brush);
          
         
          
          tim.gBrush.selectAll("rect")
                  .attr({
                    y: 0,
                    height: tim.dimensions.h - tim.padding.h
                  });
          
          
          tim.initFn();
          tim.initHandlers();
        }
        
        tim.initFn = function() {
          $log.log('::timeline -> initFn() ');
          tim.fn.x = d3.time.scale()
            .range([
              tim.padding.h * 2,
              tim._width - tim.padding.h * 2
            ]).domain([
              0, 
              100
            ]);
          
          tim.fn.y = d3.scale.sqrt()
            .range([
              30,
              5
            ]);

          tim.fn.color = d3.scale.sqrt()
            .range([
              '#ccc', '#151515'
            ]);

          tim.fn.fcolor = d3.scale.sqrt()
            .range([
              '#f6941c', '#FA8900'
            ]);
          
          // tim.fn.area = d3.svg.area()
          //     //.interpolate("monotone")
          //     .x(function (d) {
          //       return tim.fn.x(d.t);
          //     })
          //     .y0(function (d) {
          //       return tim.fn.y(d.weight);
          //     })
          //     .y1(30);
        }
        
        tim.drawDates = function (extent) {
           $log.log('::timeline -> drawDates() ', extent);
          if(!extent) {
            tim.ui.brushDateLeft.style({
              visibility: 'hidden'
            });
            tim.ui.brushDateRight.style({
              visibility: 'hidden'
            });
            return;
          }
          if(extent[0] && typeof extent[0] == 'object') {
            // console.log(extent[0])
            tim.ui.brushDateLeft.style({
              visibility: 'visible',
              transform: 'translateX(' + (tim.fn.x(extent[0]) + 50) +'px)'
            }).text(tim.fn.asDay(extent[0]));
          } else if(typeof extent[0] == 'number') {
              tim.ui.brushDateLeft.style({
              visibility: 'visible',
              transform: 'translateX(' + (tim.fn.x(extent[0]) + 50) +'px)'
            }).text(tim.fn.asDay(new Date(extent[0])));
          } else {
            tim.ui.brushDateLeft.style({
              visibility: 'hidden'
            });
          }
        
          if(typeof extent[1] == 'object') {
            tim.ui.brushDateRight.style({
              visibility: 'visible',
             transform: 'translateX(' + (tim.fn.x(extent[1]) + 110 + 50) +'px)'
            }).text(tim.fn.asDay(extent[1]));
          } else if(typeof extent[1] == 'number') {
            tim.ui.brushDateRight.style({
              visibility: 'visible',
             transform: 'translateX(' + (tim.fn.x(extent[1]) + 110 + 50) +'px)'
            }).text(tim.fn.asDay(new Date(extent[1])));
          } else {
            tim.ui.brushDateRight.style({
              visibility: 'hidden'
            });
          }
        }
        
        tim.initHandlers = function() {
          $log.log('::timeline -> initHandlers() ');
          
          // update date left and right positioning
          tim.brush.on("brush", function() {
            var extent  = tim.brush.extent();
            tim.drawDates(extent);
          });
          
          tim.brush.on("brushend", function() {
            var extent  = tim.brush.extent(),
                left    = +extent[0],
                right   = +extent[1];
            
            if(left == right) {
              $log.log('::timeline @brushend, click on the timeline just clear the things');
              tim.fn.clear();
              var previous = $location.search();
              $location.search(angular.extend(previous,{
                  from: null,
                  to: null
                }));
                scope.$apply();
              
              return;
            }
            
            $log.log('::timeline @brushend - left:',left,'- right:', right);
            
            // extent cover the whole timespan
            if(left == tim.timeExtent[0] && right == tim.timeExtent[1]) {
              $log.log('::timeline @brushend, maximum timespan, clear filters');
              tim.fn.clear();
              return;
            }
            $log.log('::timeline @brushend, visualize dates');
            
            // check whether the labels should be shown
            tim.drawDates(extent);
            
            clearTimeout(tim.brushTimer);
            tim.brushTimer = setTimeout(function(){
              //console.log(d3.time.format("%Y-%m-%d")(extent[0]))
               // console.log('extent',extent[0], typeof extent[0], isNaN(extent[0]))
              if(typeof extent[0] == 'object') {
                var previous = $location.search();
                
                $location.search(angular.extend(previous, 
                  extent[0]?{
                    from: d3.time.format("%Y-%m-%d")(extent[0])
                  } : {},
                  extent[1]?{ 
                    to: d3.time.format("%Y-%m-%d")(extent[1])
                  }: {}
                ));
                scope.$apply();
              }
            }, 10)
            
            //console.log("brushing babe", tim.brush.extent())
          });
          
          tim.svg.on("mouseover", function(){
            tim.ui.tooltip.style({'opacity': 1});
            tim.ui.pointer.style({'opacity': 1})
          });
          
          tim.svg.on("mouseout", function(){
            tim.ui.tooltip.style({'opacity': 0});
            tim.ui.pointer.style({'opacity': 0})
          });
          
          tim.svg.on("mousemove", function(){
            var pos = d3.mouse(this),
                date = new Date(tim.fn.x.invert(pos[0]-tim.padding.v));
            
            tim.ui.pointer.style({
              'opacity': pos[0] < tim.padding.v || pos[0] > tim.width() - tim.padding.v? 0:1
            }).attr('x', pos[0])
            tim.ui.tooltip.style({
              transform: 'translateX(' + (pos[0] + 150) +'px)',
              opacity: pos[0] < tim.padding.v || pos[0] > tim.width() - tim.padding.v? 0:1
            })
            tim.ui.tooltipText.text(
              tim.fn.asDay(date)
            );
              
          })
        };
        
        // evaluate initial filters
        tim.evaluate = function() {
          if(!tim.timeExtent)
            return false
          
          // evaluate scope .filters agains the current timeExtension and decide if thiere is the need for updating
          var left = scope.filters.from && scope.filters.from.length? d3.time.format("%Y-%m-%d").parse(scope.filters.from[0]): tim.timeExtent[0],
              right = scope.filters.to && scope.filters.to.length? d3.time.format("%Y-%m-%d").parse(scope.filters.to[0]): tim.timeExtent[1],
              proceed = left != tim.left || right != tim.right;

          tim.left = left;
          tim.right = right;
          $log.log('::timeline -> evaluate() - tochange:', proceed)
          return proceed;
        }
        
        tim.fn.clear = function() {
          $log.log('::timeline -> clear()');
           tim.gBrush.call(tim.brush.clear());
           tim.drawDates()
        }
        
        tim.resize = function() {
          clearTimeout(tim.resizeTimer);
          var isResizeNeeded = tim.width() != tim.ui.viewer[0][0].clientWidth;
          $log.log('::timeline @resize: ', isResizeNeeded? 'resize!': 'do not rezize');
          if(isResizeNeeded) {
            // reset ranges according to width
            tim.svg.attr("width", tim.width())
            tim.resizeTimer = setTimeout(tim.drawCtx, 200);
          }
        }

        tim.draw = function() {
          clearTimeout(tim.resizeTimer);
          if(!tim.ui.viewer || !scope.timeline)
            return;
          // tim.width(tim.ui.viewer[0][0].clientWidth);
          
          var dataset,    // the current dataset, sorted
              weigthExtent,
              timeExtent; // [minT, maxT] array of max and min timestamps


          dataset = angular.copy(_.flatten([scope.timeline])).map(function (d) {
            d.t*=1000; // different level of aggregation
            return d;
          });

          $log.log('::timeline -> draw() - w:', tim.width(), '- n. values:', dataset.length)

          // // time extent
          // tim.timeExtent = d3.extent(dataset, function (d) {
          //   return d.t
          // });
          
          // weight extent and update related function
          weigthExtent = d3.extent(dataset, function (d) {
            return d.weight
          });
          tim.fn.fcolor.domain(weigthExtent);

           console.log('    weightext: ', weigthExtent, tim.fn.fcolor(5), tim.fn.fcolor(100))
          
          // sort by time label
          dataset.sort(function (a, b) {
            return a.t < b.t ? -1 : 1
          });
          
         


          
          // if(tim.extension[0] || tim.extension[1]) {
          //   tim.brush.x(tim.fn.x).extent(tim.timeExtent);
          //   tim.gBrush.call(tim.brush.extent(tim.extension));
          //   tim.gBrush.call(tim.brush.event);
          //   tim.gBrush.selectAll('.resize rect').attr({
          //     height: 60,
          //     width: 12
          //   })
          // }
          // let's draw !!!
          var histogram = tim.histograms.selectAll('.tn')
            .data(dataset, function (d){
              return d.k || d.t
            });
          var _histograms = histogram.enter()
            .append('rect')
              .attr('class', 'tn');
          histogram.exit()
            .remove()

          histogram.
            attr({
              x: function(d) {
                return tim.fn.x(d.t)
              },
              y: 20,
              width: 2,
              height: 5,
              fill: function(d) {
                return tim.fn.fcolor(d.weight)
              }
            })
          
          
        };

        var contextualDataset,
            contextualweigthExtent;

        tim.drawCtx = function() {
          clearTimeout(tim.resizeTimer);
          if(!tim.ui.viewer || !scope.contextualTimeline)
            return;

          tim.width(tim.ui.viewer[0][0].clientWidth);
          
          var dataset,    // the current dataset, sorted
              weigthExtent,
              timeExtent; // [minT, maxT] array of max and min timestamps


          dataset = angular.copy(_.flatten([scope.contextualTimeline])).map(function (d) {
            d.t*=1000; // different level of aggregation
            return d;
          });

          $log.log('::timeline -> drawCtx() - w:', tim.width(), '- n. values:', dataset.length)

          // time extent
          tim.timeExtent = d3.extent(dataset, function (d) {
            return d.t
          });
          
          // weight extent
          weigthExtent = d3.extent(dataset, function (d) {
            return d.weight
          });
          
          // sort by time label
          dataset.sort(function (a, b) {
            return a.t < b.t ? -1 : 1
          });
          
          // set date from extent
          tim.ui.dateLeft
              .text(tim.fn.asDay(new Date(tim.timeExtent[0])));
          tim.ui.dateRight
              .text(tim.fn.asDay(new Date(tim.timeExtent[1])));
                    
          
          tim.fn.x = d3.time.scale()
            .range([0, tim.width() - tim.padding.h * 2]);
          
          tim.fn.x.domain(tim.timeExtent);
          tim.fn.y.domain(weigthExtent);
          tim.fn.color.domain(weigthExtent);
          
          console.log('::timeline -> drawCtx(): weight', weigthExtent, tim.fn.color(5), tim.fn.color(100))
          console.log('::timeline -> drawCtx(): timeExtent', tim.timeExtent)
          
          if(tim.evaluate()) {
            tim.brush.x(tim.fn.x).extent(tim.timeExtent);
            tim.gBrush.call(tim.brush.extent([+tim.left, +tim.right]));
            tim.gBrush.call(tim.brush.event);
            tim.gBrush.selectAll('.resize rect').attr({
              height: 60,
              width: 12
            })
          }

          // move brush
          // tim.drawDates()

          // let's draw !!!
          var histogram = tim.histograms.selectAll('.t')
            .data(dataset, function (d){
              return d.k || d.t
            });
          var _histograms = histogram.enter()
            .append('rect')
              .attr('class', 't');
          histogram.exit()
            .remove();

          histogram.
            attr({
              x: function(d) {
                return tim.fn.x(d.t)
              },
              // y: function(d) {
              //   return tim.fn.y(d.weight) -5
              // },
              y: 10,
              width: 2,
              height: 10,
              // height: function(d) {
              //   return 30 - tim.fn.y(d.weight)
              // },
              fill: function(d) {
                return tim.fn.color(d.weight)
              }
            })
          
          if(scope.timeline)
            tim.draw();
        };
        
        /*
          Listeners, watchers
        */
        /*
          @timeline
          if timeline values has changed, for some reason
        */
        scope.$watch('timeline', function (timeline) {
          if(!timeline || timeline.length == undefined)
            return;
          $log.log('::timeline @timeline n. nodes ', timeline.length);
          tim.draw();
        });

        /*
          @contextualTimeline
          Draw the background timeline (context)
          normally called once
        */
        scope.$watch('contextualTimeline', function (contextualTimeline) {
          if(!contextualTimeline || contextualTimeline.length == undefined)
            return;
          $log.log('::timeline @contextualTimeline n. nodes ', contextualTimeline.length);
          tim.drawCtx();
        });

        /*
          @filters
        */
        scope.$watch('filters', function(filters) {
          if(tim.evaluate()) {
            tim.brush.x(tim.fn.x).extent(tim.timeExtent);
            tim.gBrush.call(tim.brush.extent([+tim.left, +tim.right]));
            tim.gBrush.call(tim.brush.event);
            tim.gBrush.selectAll('.resize rect').attr({
              height: 60,
              width: 12
            })
          }
        })
        /*
          listen to resize window event
        */
        angular.element($window).bind('resize', tim.resize);

        tim.init();
      }
    }
  });