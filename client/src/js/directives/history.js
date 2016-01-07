'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * show various trails
 */
angular.module('histograph')
  

  .directive('flickr', function() {
    return {
      link: function(scope, element) {
        // get random palette to be used as background
        // element.css({
        //   position: 'absolute',
        //   top: 0,
        //   left:0,
        //   width: '100%',
        //   height: '100%',
        //   'background-size':'cover',
        //   'background-repeat':'no-repeat',
        //   'background-image': "url('http://www.colourlovers.com/paletteImg/98E9C4/A89B18/CC5539/DC2A44/5A2340/clap_your_hands.png')"
        // })

      }
    }
  })
  .directive('history', function($log) {
    return {
      restrict : 'A',
      template: '<div></div>',
      transclude: true,
      scope: {
        trails: '='
      },
      link : function(scope, element, attrs) {
        $log.info('::history ready', scope.trails);
        return;
        var svg = d3.select(element[0])
          .append('svg');
        
        function draw(trails) {
          var mapped = trails.map(function (d, i) {
              return {
                paths: d.paths.map(function (_d, _i) { // remap to x,y 
                  return {
                    x: 10 + d.index * 40 + 40 * _i,
                    y: 10 + i*15
                  }
                }),
                id: i,
                level: d.level,
                index: d.index,
                start: d.start
              }
            });
              
          var branches = svg.selectAll('g.branch')
                .data(mapped, function(d, i) { return d.id;})
          
            
          // new
          branches.enter()
            .append('g')
              .attr({
                'class': 'branch',
                transform: function(d, i) {
                  return ['translate(', 10 + d.index * 40, ',', 10 + i*15, ')'].join('')  
                }
              });
              
          // basic xy drawing
          var line = d3.svg.line()
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; });
          
          
          var lines = svg.selectAll('path.line')
            .data(mapped, function (d, i) {
              return 'l'+d.id
            });
            
          
          lines.attr('d', function (d, i) {
            var steer = [];
            if(d.level != i) 
              steer.push({
                x: d.paths[0].x,
                y: 10 + d.level*15
              });
            return line(steer.concat(d.paths));
          });
          
          lines.enter()
            .append('path')
              .attr({
                'class': 'line',
                id: function(d) {
                  return d.id
                },
                d: function(d) {
                  return line(d.paths)
                },
                'stroke-width': 1,
                'stroke': '#151515' 
              });
          
          
          var locations = branches.selectAll('g.location')
            .data(function (d, i) {
              return d.paths;
            }, function(d,i) {
              return i
            });
          
          locations.enter()
            .append('g')
              .attr('class', 'location')
                .append('circle').attr({
                  r: 4,
                  cy: 0,
                  cx: function (d, i) {
                    return 40 * i
                  }
                })
          // draw the line
          
          
          // // old
          // var locations = branches.select('g.branch')
            
          //   .append()
              
          // for(var i in trails) {
          //   console.log('trail i', i)
          //   for(var j in trails[i].paths)
          //     console.log(trails[i].index, trails[i].paths.length)
          // }
        }
         
        // on graph change, change the timeline as well
        scope.$watch('trails', function (trails) {
          if(!trails)
            return;
          
          $log.info('::history @trails changed', trails);
          draw(trails);
          
        }, true);
      }
    }
  });