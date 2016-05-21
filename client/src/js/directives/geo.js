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
        var map,
            markers,
            heat,
            weightScale = d3.scale.sqrt().domain([0, 1]);

        $log.log('::mapbox ready');
        element.css({ position: 'absolute', top:0, bottom:0, width:'100%' });
        
        function init(points){
          

          L.mapbox.accessToken = 'pk.eyJ1IjoiZGFuaWVsZWd1aWRvIiwiYSI6Im84VnNKdlUifQ.IVtv3hWrgHbSQBEwuWaYmw';
          map = L.mapbox.map(element[0], 'mapbox.streets')
          
           // markers = new L.MarkerClusterGroup();

          markers = new L.layerGroup();
          // heat = new L.heatLayer();

          // heat.setOptions({radius: 25});

          // map.addLayer(heat);
          // heat.addTo(map);

           

          heat = L.heatLayer([[50.5, 30.5, 0.2], [50.6, 30.4, 0.5]], {
            maxZoom: 8,
            radius:10
          }).addTo(map);

          map.addLayer(markers);
    //       L.layerGroup([marker1, marker2])
    // .addLayer(polyline)
    // .addTo(map);
          // heat = L.heatLayer(scope.points.map(function(d){
          //   // [
          //   //   [50.5, 30.5, 0.2], // lat, lng, intensity
          //   //   [50.6, 30.4, 0.5],
          //   //   ...
          //   return [
          //     d.lat,
          //     d.lng,
          //     Math.random()
          //   ]
          // }), {radius: 25}).addTo(map);
        }

        function draw(points){
          markers.clearLayers();
          var lats,
              lngs,
              weight;

          lats = d3.extent(points, function(d){
            return d.lat
          });

          lngs = d3.extent(points, function(d){
            return d.lng
          });

          weight = d3.extent(points, function(d){
            return d.w
          });

          weightScale.range(weight);
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
                  icon: L.divIcon({
                    className: 'm',
                     // iconSize: '6'
                  }),//'L.mapbox.marker.iconL.mapbox.marker.icon({'marker-symbol': 'post', 'marker-color': '0044FF'}),
                  title: title
              });
              marker.bindPopup(title);
              markers.addLayer(marker);
              // heat.addLayer(marker)
              console.log(a.lat, a.lng, weightScale(a.w));
              heat.addLatLng(new L.LatLng(a.lat, a.lng, weightScale(a.w)));
          }


         
        };

        // watch filter
        // clearLayers then draw()



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