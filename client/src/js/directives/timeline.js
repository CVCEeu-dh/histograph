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
      template: '<div class="brushdate left">left</div><div class="brushdate right">right</div><div class="date left"></div><div class="date right"></div><div class="mouse tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div><div class="viewer"></div>',
      link : function(scope, element, attrs) {
        
        var δ = { css:{}, ƒ:{}};
        
        δ.padding = {
          v: 10,
          h: 10  
        };
        
        δ.dimensions = {
          w: 1000,
          h: 50  
        };
        
        
        
        δ.ƒ.x = d3.time.scale()
            .range([δ.padding.h * 2, δ.dimensions.w - δ.padding.h * 2]);
        δ.ƒ.x.domain([0, 100]);
        δ.ƒ.y = d3.scale.sqrt()
            .range([30, 0]);
        
        δ.init = function() {
          δ.viewer      = d3.select('#timeline .viewer');
          δ.tooltip     = d3.select('#timeline .tooltip');
          δ.tooltipText = d3.select('#timeline .tooltip-inner');
          δ.dateLeft    = d3.select('#timeline .date.left');
          δ.dateRight   = d3.select('#timeline .date.right');
          δ.brushDateLeft    = d3.select('#timeline .brush.left');
          δ.brushDateRight   = d3.select('#timeline .brush.right');
              
          δ.brush       = d3.svg.brush().x(δ.ƒ.x);
          
          δ.svg     = δ.viewer
            .append("svg")
              .attr("height", δ.dimensions.h)
              .attr("width", δ.dimensions.w);
          
          δ.stream  = δ.svg.append("path")
            .attr("transform", "translate("+ δ.padding.v +"," + δ.padding.h + ")")
            .attr("class", "stream")
          
          δ.pointer = δ.svg.append("rect")
            .attr({
              height: δ.dimensions.h,
              width: 1,
              fill: 'magenta'
            })
            .style({
              'opacity': 0
            })
            
          δ.context = δ.svg.append("g")
              .attr("class", "context")
              .attr("transform", "translate(" + δ.padding.v + "," + δ.padding.h/2 + ")");                
          
          δ.gBrush = δ.context.append("g")
              .attr("class", "x brush")
              .call(δ.brush);
              
          δ.gBrush.selectAll("rect")
                  .attr({
                    y: 0,
                    height: δ.dimensions.h - δ.padding.h
                  });
          
          
          δ.area = d3.svg.area()
              //.interpolate("monotone")
              .x(function (d) {
                return δ.ƒ.x(d.t);
              })
              .y0(function (d) {
                return δ.ƒ.y(d.weight);
              })
              .y1(30);
          
          δ.brush.on("brush", function() {
            var extent = δ.brush.extent()
            clearTimeout(δ.brushTimer);
            console.log(extent)
            // δ.brushDateLeft.style({
            //   'left': pos[0] + 150,
            //   'opacity': pos[0] < δ.padding.v || pos[0] > δ.availableWidth - δ.padding.v? 0:1
            // })
            
            
            δ.brushTimer = setTimeout(function(){
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
            
            //console.log("brushing babe", δ.brush.extent())
          });
          
          δ.svg.on("mouseover", function(){
            δ.tooltip.style({'opacity': 1});
            δ.pointer.style({'opacity': 1})
          });
          
          δ.svg.on("mouseout", function(){
            δ.tooltip.style({'opacity': 0});
            δ.pointer.style({'opacity': 0})
          });
          
          δ.timeFormat = d3.time.format("%B %d, %Y");
          
          δ.svg.on("mousemove", function(){
            var pos = d3.mouse(this),
                date = new Date(δ.ƒ.x.invert(pos[0]-δ.padding.v));
            
            δ.pointer.style({
              'opacity': pos[0] < δ.padding.v || pos[0] > δ.availableWidth - δ.padding.v? 0:1
            }).attr('x', pos[0])
            δ.tooltip.style({
              'left': pos[0] + 150,
              'opacity': pos[0] < δ.padding.v || pos[0] > δ.availableWidth - δ.padding.v? 0:1
            })
            δ.tooltipText.text(
              δ.timeFormat(date)
            );
            
              
          })
          
           δ.availableWidth = δ.viewer[0][0].clientWidth;
          $log.log('::timeline -> init() ');
        };
        
        
        δ.draw = function() {
          clearTimeout(δ.resizeTimer);
          if(!δ.viewer)
            return;
          δ.availableWidth = δ.viewer[0][0].clientWidth;
          
          var dataset = angular.copy(scope.timeline).map(function (d) {
                d.t*=1000;
                return d;
              }).sort(function (a, b) {
                return a.t < b.t ? -1 : 1
              }),
              ratio = dataset.length /  δ.availableWidth,
              timeExtent = d3.extent(dataset, function(d) {return d.t});
          // set date from extent
          // console.log(timeExtent)
          δ.dateLeft
              .text(δ.timeFormat(new Date(timeExtent[0])));
          δ.dateRight
              .text(δ.timeFormat(new Date(timeExtent[1])));
          
          
          $log.log('::timeline -> draw() w:', δ.availableWidth, ' r:', ratio, scope.filters);
          
          //
          δ.svg.attr("width", δ.availableWidth)
          δ.ƒ.x = d3.time.scale()
            .range([0, δ.availableWidth - δ.padding.h * 2]);
          
          δ.ƒ.x.domain(timeExtent);
          δ.ƒ.y.domain(d3.extent(dataset, function(d) {return d.weight}));
          $log.log('::', timeExtent);
          δ.brush.x(δ.ƒ.x).extent(timeExtent);
          // δ.gBrush.call(δ.brush.event);
          
          δ.stream
            .attr("d", δ.area(dataset));
        };
        
        /*
          Listeners, watchers
        */
        // on graph change, change the timeline as well
        scope.$watch('timeline', function (timeline) {
          if(!timeline)
            return;
          $log.log('::timeline n. nodes ', timeline.length);
          
          δ.init();
          δ.draw();
          // computate min and max
        });
        
        scope.$watch('filters', function (filters) {
          if(filters)
            $log.log('::timeline filters:',filters);
        })
        
        angular.element($window).bind('resize', function() {
          clearTimeout(δ.resizeTimer);
          δ.resizeTimer = setTimeout(δ.draw, 200);
        });
        
        
      }
    }
  });