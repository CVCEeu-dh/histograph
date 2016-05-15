/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * This module contains some directives dealing with geographical data (mapbox)
 */
angular.module('histograph')
  /*
    This directive display the text content from a text file via $http.get
  */
  .directive('mapbox', function($compile, $log, $http) {
    return {
      restrict : 'EA',
      template: '<div>url: {{url}}</div>',
      scope:{
        points: '='
      },
      link : function(scope, element, attrs) {
        'use strict';
        // mapbox map value, filled during init()
        var map;

        $log.log('::mapbox ready');
        element.css({ position: 'absolute', top:0, bottom:0, width:'100%' });
        
        function init(points){
          

          L.mapbox.accessToken = 'pk.eyJ1IjoiZGFuaWVsZWd1aWRvIiwiYSI6Im84VnNKdlUifQ.IVtv3hWrgHbSQBEwuWaYmw';
          map = L.mapbox.map(element[0], 'mapbox.streets')
            

        }

        function draw(points){
          var markers = new L.MarkerClusterGroup(),
              lats,
              lngs;

          lats = d3.extent(points, function(d){
            return d.lat
          });

          lngs = d3.extent(points, function(d){
            return d.lng
          });

          // map.setView([-37.82, 175.215], 14);

          map.fitBounds([[
            lats[0], 
            lngs[0],
          ],[ 
            lats[1], 
            lngs[1],
          ]]);

          for (var i = 0; i < scope.points.length; i++) {
              var a = scope.points[i];
              var title = a.name;
              var marker = L.marker(new L.LatLng(a.lat, a.lng), {
                  icon: L.mapbox.marker.icon({'marker-symbol': 'post', 'marker-color': '0044FF'}),
                  title: title
              });
              marker.bindPopup(title);
              markers.addLayer(marker);
          }

          map.addLayer(markers);
        }

        scope.$watch('points', function(points){
          if(!points)
            return;
          $log.log('::mapbox @points');
          init(points);
          draw(points)
        })
      }
    }
  })