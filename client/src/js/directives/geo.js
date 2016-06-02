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
  .directive('mapbox', function($compile, $log, $http, EVENTS) {
    return {
      restrict : 'EA',
      template: '<div></div>',
      scope:{
        points: '=',
        filters: '=',
        setFilter: '&filter'
      },
      link : function(scope, element, attrs) {
        'use strict';
        // mapbox map value, filled during init()
        var map,
            markers,
            heat,
            bounds, // current bounds... cfr addFilter inside @moveend event
            weightScale = d3.scale.sqrt().domain([0, 1]);

        $log.log('::mapbox ready', scope.filters);
        element.css({ position: 'absolute', top:0, bottom:0, width:'100%' });

        // initialize mapbox and draw leaflet layers
        function init(){
          L.mapbox.accessToken = 'pk.eyJ1IjoiZGFuaWVsZWd1aWRvIiwiYSI6Im84VnNKdlUifQ.IVtv3hWrgHbSQBEwuWaYmw';
          map = L.mapbox.map(element[0], 'mapbox.streets')
          markers = new L.layerGroup();
          heat = L.heatLayer([[50.5, 30.5, 0.2], [50.6, 30.4, 0.5]], {
            maxZoom: 8,
            radius:10
          }).addTo(map);

          map.addLayer(markers);
          map.on('moveend', function() { 
            var _b = map.getBounds(),
                // the current filter
                _bounds = [
                  _b._northEast.lat,
                  _b._northEast.lng,
                  _b._southWest.lat,
                  _b._southWest.lng
                ].join(';');
            $log.log('::mapbox @moveend', _bounds)
            if(bounds !== undefined && _bounds != bounds){
              $log.log('::mapbox @moveend')
              scope.setFilter({
                key: 'bounds',
                value: _bounds
              });
              scope.$apply();
            }
            bounds = _bounds;
            
          });
        };

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
          
          // map.setView([-37.82, 175.215], 2);

          // map.fitBounds([[
          //   lats[0], 
          //   lngs[0],
          // ],[ 
          //   lats[1], 
          //   lngs[1],
          // ]]);

          

          // redraw heat
          heat.setLatLngs(scope.points.map(function(p){
            return new L.LatLng(p.lat, p.lng, weightScale(p.w));
          }));

          if(scope.points.length < 500){

          }
          // for (var i = 0, j = scope.points.length; i < j; i++) {
          //     var a = scope.points[i];
          //     var title = a.name;

          //     // var marker = L.marker(new L.LatLng(a.lat, a.lng), {
          //     //     icon: L.divIcon({
          //     //       className: 'm',
          //     //        // iconSize: '6'
          //     //     }),//'L.mapbox.marker.iconL.mapbox.marker.icon({'marker-symbol': 'post', 'marker-color': '0044FF'}),
          //     //     title: title
          //     // });
          //     // marker.bindPopup(title);
          //     // markers.addLayer(marker);
          //     // // heat.addLayer(marker)
          //     // console.log(a.lat, a.lng, weightScale(a.w));
          //     heat.addLatLng(new L.LatLng(a.lat, a.lng, weightScale(a.w)));
          // }


         
        };



        init();

        scope.$watch('points', function(points){
          if(!points)
            return;
          $log.log('::mapbox @points');
          draw(points)
        });

      }
    }
  })