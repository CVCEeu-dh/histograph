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
          tim.brushDateRight    = d3.select('#timeline .brushdate.right');
              
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
          
          tim.gBrush.selectAll('.resize').append('rect')
            .attr({
              height: 50,
              width: 5
            })
          
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
              0
            ]);
          
          tim.fn.area = d3.svg.area()
              //.interpolate("monotone")
              .x(function (d) {
                return tim.fn.x(d.t);
              })
              .y0(function (d) {
                return tim.fn.y(d.weight);
              })
              .y1(30);
        }
        
        tim.initHandlers = function() {
          $log.log('::timeline -> initHandlers() ');
          tim.brush.on("brush", function() {
            var extent = tim.brush.extent();
            if(typeof extent[0] == 'object') {
              tim.ui.brushDateLeft.style({
                left: tim.fn.x(extent[0]) + 50
              }).text(tim.fn.asDay(extent[0]));
              tim.brushDateRight.style({
                left: tim.fn.x(extent[1]) + 110 + 50
              }).text(tim.fn.asDay(extent[1]));
            }
            // tim.ui.brushDateLeft.style({
            //   'left': pos[0] + 150,
            //   'opacity': pos[0] < tim.padding.v || pos[0] > tim.width() - tim.padding.v? 0:1
            // })
            
            clearTimeout(tim.brushTimer);
            tim.brushTimer = setTimeout(function(){
              //console.log(d3.time.format("%Y-%m-%d")(extent[0]))
               // console.log('extent',extent[0], typeof extent[0], isNaN(extent[0]))
              if(typeof extent[0] == 'object') {
             
                $location.search({
                  from: d3.time.format("%Y-%m-%d")(extent[0]),
                  to: d3.time.format("%Y-%m-%d")(extent[1])
                });
                scope.$apply();
              }
            }, 1000)
            
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
              'left': pos[0] + 150,
              'opacity': pos[0] < tim.padding.v || pos[0] > tim.width() - tim.padding.v? 0:1
            })
            tim.ui.tooltipText.text(
              tim.fn.asDay(date)
            );
              
          })
        };
        
        tim.draw = function() {
          clearTimeout(tim.resizeTimer);
          if(!tim.ui.viewer)
            return;
          tim.width(tim.ui.viewer[0][0].clientWidth);
          
          var dataset,    // the current dataset, sorted
              weigthExtent,
              timeExtent; // [minT, maxT] array of max and min timestamps
          
          timeExtent = d3.extent(scope.timeline, function (d) {
            return d.t*1000
          });
          
          if(scope.timeline.length < 1000)
            dataset = angular.copy(scope.timeline).map(function (d) {
              d.t*=1000; // different level of aggregation
              return d;
            });
          else {
            dataset = angular.copy(scope.timeline).map(function (d) {
              d.t*=1000; // different level of aggregation
              d.m = tim.fn.asYear(new Date(d.t));
              return d;
            });
            dataset = _.map(_.groupBy(dataset, 'm'), function (values, k) {
              return {
                weight: _.sum(values, 'weight'),
                k: k,
                t: _.min(values, 't').t,
                t1: _.max(values, 't').t
              };
            });
            console.log('timeline',_.take(dataset, 5))
          }
           
          weigthExtent = d3.extent(dataset, function (d) {
            return d.weight
          });
          
          
          dataset.sort(function (a, b) {
            return a.t < b.t ? -1 : 1
          });
          
          // loop throug data
          $log.log('::timeline -> draw() - w:', tim.width(), '- n. values:', dataset.length)
          
          // set date from extent
          // console.log(timeExtent)
          tim.ui.dateLeft
              .text(tim.fn.asDay(new Date(timeExtent[0])));
          tim.ui.dateRight
              .text(tim.fn.asDay(new Date(timeExtent[1])));
          
          
          //, d3.time.format("%Y-%m-%d").parse(scope.filters.from));
          
          // transform filters in other filters.
          var extension = [
            scope.filters.from? d3.time.format("%Y-%m-%d").parse(scope.filters.from): timeExtent[0],
            scope.filters.to? d3.time.format("%Y-%m-%d").parse(scope.filters.to): timeExtent[1]
          ]
          
          //
          tim.svg.attr("width", tim.width())
          tim.fn.x = d3.time.scale()
            .range([0, tim.width() - tim.padding.h * 2]);
          
          tim.fn.x.domain(timeExtent);
          tim.fn.y.domain(weigthExtent);
          $log.log('::timeline', timeExtent);
          tim.brush.x(tim.fn.x).extent(timeExtent);
          
          tim.gBrush.call(tim.brush.extent(extension));
          tim.gBrush.call(tim.brush.event);
          
          // let's draw !!!
          var histogram = tim.histograms.selectAll('.t')
            .data(dataset, function (d){
              return d.k || d.t
            });
          var _histograms = histogram.enter()
            .append('rect')
              .attr('class', 't');
          
          histogram.
            attr({
              x: function(d) {
                return tim.fn.x(d.t)
              },
              y: function(d) {
                return tim.fn.y(d.weight)
              },
              width: 4,
              height: function(d) {
                return 30 - tim.fn.y(d.weight)
              }
            })
          
          
        };
        
        /*
          Listeners, watchers
        */
        // on graph change, change the timeline as well
        scope.$watch('timeline', function (timeline) {
          if(!timeline)
            return;
          $log.log('::timeline n. nodes ', timeline.length);
          
          tim.init();
          tim.draw();
          // computate min and max
        });
        
        scope.$watch('filters', function (filters) {
          if(filters) {
            $log.log('::timeline filters:',filters);
            tim.draw();
          }
        })
        
        angular.element($window).bind('resize', function() {
          
          clearTimeout(tim.resizeTimer);
          tim.resizeTimer = setTimeout(tim.draw, 200);
        });
        
        
      }
    }
  });